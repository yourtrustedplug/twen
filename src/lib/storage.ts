import { supabase } from '@/integrations/supabase/client';

export const ASSET_BUCKET = 'campaign-assets';

/** Uploads a file into the signed-in user's folder and returns its storage path. */
export const uploadAsset = async (file: File, userId: string, folder = 'campaigns') => {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(ASSET_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
};

/** Resolves a storage path to a temporary URL. Absolute URLs pass through. */
export const signedUrl = async (path: string, expiresIn = 3600) => {
  if (/^https?:\/\//.test(path)) return path;
  const { data } = await supabase.storage.from(ASSET_BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? '';
};

export const signedUrls = async (paths: string[]) =>
  Promise.all(paths.map(async (p) => ({ path: p, url: await signedUrl(p) })));
