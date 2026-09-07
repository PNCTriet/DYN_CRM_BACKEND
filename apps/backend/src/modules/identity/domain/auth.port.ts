/** AuthPort — IdP abstraction (Architecture AD-A3). */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt?: number;
  tokenType: string;
}

export interface AuthSubject {
  subjectId: string;
  email: string | null;
  /** Display name hint from IdP (OAuth metadata). */
  displayName?: string | null;
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export type OAuthProvider = 'google';

export interface OAuthAuthorizeResult {
  url: string;
  /** PKCE / auth storage bag — persist in httpOnly cookie between start and callback. */
  pkceStorage: Record<string, string>;
}

export abstract class AuthPort {
  abstract signUp(
    input: SignUpInput,
  ): Promise<{ subject: AuthSubject; tokens: AuthTokens | null }>;
  abstract signIn(input: SignInInput): Promise<{ subject: AuthSubject; tokens: AuthTokens }>;
  abstract signOut(accessToken: string): Promise<void>;
  abstract refresh(refreshToken: string): Promise<AuthTokens>;
  abstract getSubject(accessToken: string): Promise<AuthSubject | null>;
  abstract requestPasswordReset(email: string, redirectTo?: string): Promise<void>;
  abstract updatePassword(accessToken: string, newPassword: string): Promise<void>;

  abstract getOAuthAuthorizeUrl(input: {
    provider: OAuthProvider;
    redirectTo: string;
  }): Promise<OAuthAuthorizeResult>;

  abstract exchangeOAuthCode(input: {
    code: string;
    pkceStorage: Record<string, string>;
  }): Promise<{ subject: AuthSubject; tokens: AuthTokens }>;
}
