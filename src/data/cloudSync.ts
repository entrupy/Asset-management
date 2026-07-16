import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  isCloudSyncEnabled,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  WORKSPACE_ID,
  type StorageMode,
} from '../config';
import { getPerformedBy } from './settings';

export type CloudSnapshot = {
  payload: unknown;
  updated_at: string;
  updated_by?: string | null;
};

let client: SupabaseClient | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncAt: string | null = null;
let lastSyncError: string | null = null;
let storageMode: StorageMode = 'local';

type SyncListener = () => void;
const syncListeners = new Set<SyncListener>();

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function getStorageMode(): StorageMode {
  return storageMode;
}

export function getLastSyncAt(): string | null {
  return lastSyncAt;
}

export function getLastSyncError(): string | null {
  return lastSyncError;
}

export function subscribeSyncStatus(fn: SyncListener): () => void {
  syncListeners.add(fn);
  return () => syncListeners.delete(fn);
}

function notifySyncStatus(): void {
  syncListeners.forEach((fn) => fn());
}

export async function fetchCloudSnapshot(): Promise<CloudSnapshot | null> {
  if (!isCloudSyncEnabled()) return null;
  const { data, error } = await getClient()
    .from('workspace_snapshots')
    .select('payload, updated_at, updated_by')
    .eq('workspace_id', WORKSPACE_ID)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.payload) return null;
  return data as CloudSnapshot;
}

export async function pushCloudSnapshot(payload: unknown): Promise<void> {
  if (!isCloudSyncEnabled()) return;
  const now = new Date().toISOString();
  const { error } = await getClient().from('workspace_snapshots').upsert({
    workspace_id: WORKSPACE_ID,
    payload,
    updated_at: now,
    updated_by: getPerformedBy(),
  });

  if (error) throw new Error(error.message);
  lastSyncAt = now;
  lastSyncError = null;
  notifySyncStatus();
}

export function scheduleCloudSync(getPayload: () => unknown): void {
  if (!isCloudSyncEnabled() || storageMode !== 'cloud') return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void pushCloudSnapshot(getPayload()).catch((err) => {
      lastSyncError = err instanceof Error ? err.message : 'Cloud sync failed';
      notifySyncStatus();
    });
  }, 1200);
}

export async function syncNow(getPayload: () => unknown): Promise<{ ok: boolean; error?: string }> {
  if (!isCloudSyncEnabled()) {
    return { ok: false, error: 'Cloud sync is not configured.' };
  }
  try {
    await pushCloudSnapshot(getPayload());
    storageMode = 'cloud';
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cloud sync failed';
    lastSyncError = message;
    notifySyncStatus();
    return { ok: false, error: message };
  }
}

export async function pullCloudSnapshot(): Promise<CloudSnapshot | null> {
  if (!isCloudSyncEnabled()) return null;
  try {
    const snapshot = await fetchCloudSnapshot();
    if (snapshot) {
      lastSyncAt = snapshot.updated_at;
      lastSyncError = null;
      storageMode = 'cloud';
      notifySyncStatus();
    }
    return snapshot;
  } catch (err) {
    lastSyncError = err instanceof Error ? err.message : 'Could not load cloud data';
    notifySyncStatus();
    throw err;
  }
}

export function setStorageMode(mode: StorageMode): void {
  storageMode = mode;
  notifySyncStatus();
}

export async function testCloudConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!isCloudSyncEnabled()) {
    return { ok: false, error: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud sync.' };
  }
  try {
    const { error } = await getClient()
      .from('workspace_snapshots')
      .select('workspace_id')
      .eq('workspace_id', WORKSPACE_ID)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
}
