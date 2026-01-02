import { supabaseService, BUCKET_NAME } from "./supabase";

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
    
    // Ensure the bucket exists, create if it doesn't
    const { data: buckets, error: listError } = await client.storage.listBuckets();
    if (!listError) {
      const bucketExists = buckets?.some(b => b.id === this.bucket || b.name === this.bucket);
      if (!bucketExists) {
        // Try to create the bucket (this might fail if user doesn't have permission, but that's okay)
        await client.storage.createBucket(this.bucket, {
          public: false,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
        });
      }
    }

    // Upload the file
    const { data: uploadData, error } = await client.storage
      .from(this.bucket)
      .upload(key, data, {
        contentType: mimeType,
        upsert: false,
        cacheControl: '3600',
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    if (!uploadData) {
      throw new Error('Upload succeeded but no data returned');
    }

    return {
      provider: "supabase",
      bucket: this.bucket,
      path: uploadData.path || key,
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

const defaultBucket = process.env.SUPABASE_BUCKET_NAME || BUCKET_NAME;
export const storageClient: StorageClient = new SupabaseStorageClient(
  defaultBucket
);

// Helper function to create a storage client with a custom bucket
export function createStorageClient(bucket: string): StorageClient {
  return new SupabaseStorageClient(bucket);
}