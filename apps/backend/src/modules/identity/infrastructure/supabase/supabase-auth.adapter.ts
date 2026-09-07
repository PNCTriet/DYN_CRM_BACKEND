import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import {
  AuthPort,
  AuthSubject,
  AuthTokens,
  OAuthAuthorizeResult,
  OAuthProvider,
  SignInInput,
  SignUpInput,
} from '../../domain/auth.port';
import { MapAuthStorage } from './map-auth-storage';

@Injectable()
export class SupabaseAuthAdapter extends AuthPort {
  private readonly url: string;
  private readonly key: string;
  private readonly client: SupabaseClient;

  constructor(config: ConfigService) {
    super();
    const url = config.get<string>('SUPABASE_URL');
    const key =
      config.get<string>('SUPABASE_PUBLISHABLE_KEY') ??
      config.get<string>('SUPABASE_ANON_KEY');
    if (!url || !key) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) are required for AuthPort',
      );
    }
    this.url = url;
    this.key = key;
    // Node < 22: supabase-js realtime needs an explicit WebSocket impl
    this.client = this.createClient();
  }

  private createClient(
    accessToken?: string,
    storage?: MapAuthStorage,
  ): SupabaseClient {
    return createClient(this.url, this.key, {
      ...(accessToken
        ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
        : {}),
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        flowType: 'pkce',
        ...(storage ? { storage, persistSession: true } : {}),
      },
      realtime: {
        // Auth BFF does not use realtime; transport only satisfies client init on Node 20
        transport: WebSocket as unknown as typeof globalThis.WebSocket,
      },
    });
  }

  private clientAsUser(accessToken: string): SupabaseClient {
    return this.createClient(accessToken);
  }

  private mapSession(session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
    token_type: string;
  }): AuthTokens {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
      expiresAt: session.expires_at,
      tokenType: session.token_type ?? 'bearer',
    };
  }

  private subjectFromUser(user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  }): AuthSubject {
    const meta = user.user_metadata ?? {};
    const displayName =
      (typeof meta.full_name === 'string' && meta.full_name) ||
      (typeof meta.name === 'string' && meta.name) ||
      (typeof meta.display_name === 'string' && meta.display_name) ||
      null;
    return {
      subjectId: user.id,
      email: user.email ?? null,
      displayName,
    };
  }

  async signUp(input: SignUpInput) {
    const { data, error } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { display_name: input.displayName },
      },
    });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
    if (!data.user) {
      throw new BadRequestException('Signup failed');
    }
    // Email confirmation enabled → user created, session null until confirm
    return {
      subject: {
        subjectId: data.user.id,
        email: data.user.email ?? input.email,
      },
      tokens: data.session ? this.mapSession(data.session) : null,
    };
  }

  async signIn(input: SignInInput) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error || !data.session || !data.user) {
      throw new UnauthorizedException(error?.message ?? 'Invalid credentials');
    }
    return {
      subject: {
        subjectId: data.user.id,
        email: data.user.email ?? input.email,
      },
      tokens: this.mapSession(data.session),
    };
  }

  async signOut(accessToken: string): Promise<void> {
    const { error } = await this.clientAsUser(accessToken).auth.signOut({
      scope: 'global',
    });
    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { data, error } = await this.client.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session) {
      throw new UnauthorizedException(error?.message ?? 'Invalid refresh token');
    }
    return this.mapSession(data.session);
  }

  async getSubject(accessToken: string): Promise<AuthSubject | null> {
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error || !data.user) {
      return null;
    }
    return this.subjectFromUser(data.user);
  }

  async requestPasswordReset(email: string, redirectTo?: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updatePassword(accessToken: string, newPassword: string): Promise<void> {
    const { error } = await this.clientAsUser(accessToken).auth.updateUser({
      password: newPassword,
    });
    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getOAuthAuthorizeUrl(input: {
    provider: OAuthProvider;
    redirectTo: string;
  }): Promise<OAuthAuthorizeResult> {
    const storage = new MapAuthStorage();
    const client = this.createClient(undefined, storage);
    const { data, error } = await client.auth.signInWithOAuth({
      provider: input.provider,
      options: {
        redirectTo: input.redirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) {
      throw new BadRequestException(
        error?.message ?? 'Failed to start OAuth authorize URL',
      );
    }
    return { url: data.url, pkceStorage: storage.toRecord() };
  }

  async exchangeOAuthCode(input: {
    code: string;
    pkceStorage: Record<string, string>;
  }): Promise<{ subject: AuthSubject; tokens: AuthTokens }> {
    const storage = MapAuthStorage.fromRecord(input.pkceStorage);
    const client = this.createClient(undefined, storage);
    const { data, error } = await client.auth.exchangeCodeForSession(input.code);
    if (error || !data.session || !data.user) {
      throw new UnauthorizedException(
        error?.message ?? 'OAuth code exchange failed',
      );
    }
    return {
      subject: this.subjectFromUser(data.user),
      tokens: this.mapSession(data.session),
    };
  }
}
