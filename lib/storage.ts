import { supabaseService } from "./supabase";

export type StorageProviderName = "supabase";

export interface UploadResult {
  provider: StorageProviderName;
  bucket: string;
  path: string;
}

export interface StorageClient {
  upload(
    key: string,
    data: Buffer,
    mimeType: string
  ): Promise<UploadResult>;
  signedUrl(
    bucket: string,
    path: string,
    expiresInSeconds: number
  ): Promise<string>;
}

class SupabaseStorageClient implements StorageClient {
  private bucket: string;

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  async upload(
    key: string,
    data: Buffer,
    mimeType: string
  ): Promise<UploadResult> {
    const client = supabaseService();
    const { error } = await client.storage
      .from(this.bucket)
      .upload(key, data, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    return {
      provider: "supabase",
      bucket: this.bucket,
      path: key,
    };
  }

  async signedUrl(
    bucket: string,
    path: string,
    expiresInSeconds: number
  ): Promise<string> {
    const client = supabaseService();
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data) {
      throw new Error(`Supabase signedUrl failed: ${error?.message}`);
    }

    return data.signedUrl;
  }
}

const defaultBucket = process.env.SUPABASE_BUCKET_NAME!;
export const storageClient: StorageClient = new SupabaseStorageClient(
  defaultBucket
);
