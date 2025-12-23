import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseBrowser: SupabaseClient | null = anonKey
  ? createClient(supabaseUrl, anonKey)
  : null;

export function supabaseService() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey);
}

export const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || "files";

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
