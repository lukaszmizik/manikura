const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const BUCKET = "visit-photos";
const SALON_BUCKET = "salon-assets";

export function getPublicPhotoUrl(storagePath: string): string {
  if (!SUPABASE_URL) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

export function getSalonAssetUrl(storagePath: string): string {
  if (!SUPABASE_URL) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/${SALON_BUCKET}/${storagePath}`;
}
