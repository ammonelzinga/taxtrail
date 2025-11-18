import { supabase } from '@/services/supabase';
import { getSignedUrl } from '@/services/storage';

export type FormFile = {
  name: string;
  path: string;
  createdAt?: string;
  updatedAt?: string;
  lastAccessedAt?: string;
};

export async function listUserForms(userId?: string): Promise<FormFile[]> {
  if (!userId) return [];
  const folder = `${userId}/forms`;
  const { data, error } = await supabase.storage.from('forms').list(folder, {
    limit: 100,
    sortBy: { column: 'updated_at', order: 'desc' } as any
  } as any);
  if (error) throw error;
  return (data || []).map((f: any) => ({
    name: f.name,
    path: `${folder}/${f.name}`,
    createdAt: f.created_at || f.createdAt,
    updatedAt: f.updated_at || f.updatedAt,
    lastAccessedAt: f.last_accessed_at || f.lastAccessedAt
  }));
}

export async function getSignedFormUrl(path: string, expires = 600) {
  return await getSignedUrl('forms', path, expires);
}
