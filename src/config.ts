/** Application metadata and runtime configuration (from Vite env). */

export const APP_NAME = 'AssetTrack IT';
export const APP_VERSION = '1.0.0';
export const APP_TAGLINE = 'IT asset & employee inventory';

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
export const WORKSPACE_ID = (import.meta.env.VITE_WORKSPACE_ID ?? 'default').trim();

export type StorageMode = 'local' | 'cloud';

export function isCloudSyncEnabled(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getStorageModeLabel(mode: StorageMode): string {
  return mode === 'cloud' ? 'Team cloud (Supabase)' : 'Browser local storage';
}
