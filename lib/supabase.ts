import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing Supabase URL. Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable."
  );
}

export const supabaseBrowser: SupabaseClient | null = anonKey
  ? createClient(supabaseUrl, anonKey)
  : null;

export function supabaseService() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceKey) {
    throw new Error(
      "Missing Supabase Service Role Key. Please set SUPABASE_SERVICE_ROLE_KEY environment variable."
    );
  }
  
  if (!supabaseUrl) {
    throw new Error(
      "Missing Supabase URL. Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable."
    );
  }
  
  return createClient(supabaseUrl, serviceKey);
}

export const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || "insurancePolicies";

export function getFilePath(
  ventureId: number | null,
  entityType: string,
  entityId: number,
  fileName: string
): string {
  const venturePrefix = ventureId ? `venture-${ventureId}` : "venture-global";
  const uuid = crypto.randomUUID();
  const ext = fileName.split(".").pop() || "bin";
  return `${venturePrefix}/${entityType}-${entityId}/${uuid}.${ext}`;
}
