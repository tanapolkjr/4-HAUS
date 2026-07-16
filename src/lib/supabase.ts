import { createClient } from '@supabase/supabase-js';
import { STORAGE_BUCKET } from './constants';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env');
}

export const supabase = createClient(url, anonKey);

/** Public URL for an image path stored in product_images.image_url. */
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}
