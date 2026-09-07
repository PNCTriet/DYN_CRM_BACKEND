import { Global, Module } from '@nestjs/common';
import { StoragePort } from './storage.port';
import { SupabaseStorageAdapter } from './supabase-storage.adapter';

@Global()
@Module({
  providers: [{ provide: StoragePort, useClass: SupabaseStorageAdapter }],
  exports: [StoragePort],
})
export class StorageModule {}
