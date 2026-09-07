import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import {
  StoragePort,
  StoredObject,
  UploadObjectInput,
} from './storage.port';

/**
 * Supabase Storage adapter.
 * Prefer SUPABASE_SERVICE_ROLE_KEY so Nest can write to a private bucket
 * without relying on Storage RLS for end-user JWTs.
 */
@Injectable()
export class SupabaseStorageAdapter extends StoragePort {
  private readonly logger = new Logger(SupabaseStorageAdapter.name);
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    super();
    const url = config.get<string>('SUPABASE_URL');
    const serviceKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const publishable =
      config.get<string>('SUPABASE_PUBLISHABLE_KEY') ??
      config.get<string>('SUPABASE_ANON_KEY');
    const key = serviceKey || publishable;
    if (!url || !key) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (recommended) or PUBLISHABLE_KEY required for StoragePort',
      );
    }
    if (!serviceKey) {
      this.logger.warn(
        'SUPABASE_SERVICE_ROLE_KEY missing — Storage uploads may fail if bucket RLS blocks publishable key',
      );
    }
    this.bucket = (
      process.env.STORAGE_BUCKET ||
      config.get<string>('STORAGE_BUCKET') ||
      'documents'
    ).trim();
    this.logger.log(
      `Storage ready bucket=${this.bucket} auth=${serviceKey ? 'service_role' : 'publishable'}`,
    );
    this.client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      realtime: {
        transport: WebSocket as unknown as typeof globalThis.WebSocket,
      },
    });
  }

  getBucket(): string {
    return this.bucket;
  }

  async upload(input: UploadObjectInput): Promise<StoredObject> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(input.storageKey, input.body, {
        contentType: input.contentType,
        upsert: input.upsert ?? false,
      });
    if (error) {
      throw new BadRequestException(
        `Storage upload failed: ${error.message} (bucket=${this.bucket})`,
      );
    }
    return {
      bucket: this.bucket,
      storageKey: input.storageKey,
      byteSize: input.body.byteLength,
      contentType: input.contentType ?? null,
    };
  }

  async createSignedDownloadUrl(
    storageKey: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, expiresInSeconds);
    if (error || !data?.signedUrl) {
      throw new BadRequestException(
        `Signed URL failed: ${error?.message ?? 'unknown'}`,
      );
    }
    return data.signedUrl;
  }

  async remove(storageKey: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([storageKey]);
    if (error) {
      throw new BadRequestException(`Storage remove failed: ${error.message}`);
    }
  }
}
