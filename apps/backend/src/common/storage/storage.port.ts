/** StoragePort — object storage abstraction (Architecture AD StoragePort). */

export interface StoredObject {
  bucket: string;
  storageKey: string;
  byteSize: number;
  contentType: string | null;
}

export interface UploadObjectInput {
  storageKey: string;
  body: Buffer;
  contentType?: string;
  upsert?: boolean;
}

export abstract class StoragePort {
  abstract upload(input: UploadObjectInput): Promise<StoredObject>;
  abstract createSignedDownloadUrl(
    storageKey: string,
    expiresInSeconds?: number,
  ): Promise<string>;
  abstract remove(storageKey: string): Promise<void>;
  abstract getBucket(): string;
}
