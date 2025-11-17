import { supabase } from '@/services/supabase';

export async function getSignedReceiptUrl(path: string, expiresInSeconds = 600) {
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
