import React, { useEffect, useRef, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Building2,
  Cloud,
  CloudOff,
  Database,
  Download,
  HardDrive,
  RefreshCw,
  Shield,
  Upload,
  User,
  BookOpen,
  Settings2,
} from 'lucide-react';
import {
  APP_NAME,
  APP_VERSION,
  WORKSPACE_ID,
  getStorageModeLabel,
  isCloudSyncEnabled,
} from '../config';
import {
  getLastSyncAt,
  getLastSyncError,
  getStorageMode,
  pullCloudSnapshot,
  subscribeSyncStatus,
  syncNow,
  testCloudConnection,
} from '../data/cloudSync';
import { getSettings, updateSettings } from '../data/settings';
import { getCloudPayload, getWorkspaceSnapshot, restoreFromBackup } from '../data/localStore';
import { buildBackupPayload, downloadBackupJson, parseBackupFile } from '../lib/backup';
import { iconSize } from '../lib/icons';
import { PageHeader, TabBar, DetailCard, DetailRow, type TabItem } from './ui/DetailTabs';
import { toast } from '../lib/toast';

type SettingsTab = 'general' | 'data' | 'backup' | 'about';

export default function Settings() {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState(getSettings());
  const [storageMode, setStorageMode] = useState(getStorageMode());
  const [lastSyncAt, setLastSyncAt] = useState(getLastSyncAt());
  const [lastSyncError, setLastSyncError] = useState(getLastSyncError());
  const [busy, setBusy] = useState<string | null>(null);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const snapshot = getWorkspaceSnapshot();

  useEffect(() => {
    return subscribeSyncStatus(() => {
      setStorageMode(getStorageMode());
      setLastSyncAt(getLastSyncAt());
      setLastSyncError(getLastSyncError());
    });
  }, []);

  useEffect(() => {
    if (!isCloudSyncEnabled()) return;
    void testCloudConnection().then((r) => setConnectionOk(r.ok));
  }, []);

  const saveSettings = () => {
    updateSettings(settings);
    toast('Organization settings saved.');
  };

  const handleBackup = () => {
    const s = getWorkspaceSnapshot();
    downloadBackupJson(
      buildBackupPayload(getSettings(), {
        assets: s.assets,
        employees: s.employees,
        assignments: s.assignments,
        history: s.history,
      })
    );
    toast('Backup downloaded.');
  };

  const handleRestore = async (file: File) => {
    setBusy('restore');
    try {
      const text = await file.text();
      const payload = parseBackupFile(text);
      restoreFromBackup(payload);
      updateSettings(payload.settings);
      setSettings(payload.settings);
      toast(
        `Restored backup from ${format(new Date(payload.exportedAt), 'MMM d, yyyy HH:mm')} (${payload.data.assets.length} assets, ${payload.data.employees.length} employees).`
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not restore backup.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleCloudSync = async () => {
    setBusy('sync');
    const result = await syncNow(() => getCloudPayload());
    setBusy(null);
    if (result.ok) toast('Inventory synced to cloud.');
    else toast(result.error ?? 'Sync failed.', 'error');
  };

  const handleCloudPull = async () => {
    setBusy('pull');
    try {
      const remote = await pullCloudSnapshot();
      if (!remote?.payload) {
        toast('No cloud data found for this workspace yet.', 'info');
        return;
      }
      restoreFromBackup({
        version: 1,
        appVersion: APP_VERSION,
        exportedAt: remote.updated_at,
        settings: getSettings(),
        data: remote.payload as ReturnType<typeof getWorkspaceSnapshot>,
      });
      toast(`Loaded latest cloud data (${formatDistanceToNow(new Date(remote.updated_at), { addSuffix: true })}).`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not load cloud data.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const tabs: TabItem<SettingsTab>[] = [
    { id: 'general' as const, label: 'General', icon: Building2 },
    { id: 'data' as const, label: 'Data & sync', icon: Cloud },
    { id: 'backup' as const, label: 'Backup', icon: Database },
    { id: 'about' as const, label: 'About', icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description={`Configure ${APP_NAME} for your organization — profile, team storage, backups, and deployment.`}
        badge={
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
            v{APP_VERSION}
          </span>
        }
      />

      <TabBar<SettingsTab> tabs={tabs} active={settingsTab} onChange={setSettingsTab} />

      {settingsTab === 'general' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <DetailCard title="Organization profile" icon={Building2} className="bg-white border-gray-100">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Organization name</span>
              <input
                value={settings.organizationName}
                onChange={(e) => setSettings((s) => ({ ...s, organizationName: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Admin display name</span>
              <div className="relative mt-1.5">
                <User className={`${iconSize.md} pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400`} />
                <input
                  value={settings.adminDisplayName}
                  onChange={(e) => setSettings((s) => ({ ...s, adminDisplayName: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-400">Used in audit history and cloud sync metadata.</p>
            </label>
            <button
              type="button"
              onClick={saveSettings}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Save changes
            </button>
          </DetailCard>

          <DetailCard title="Inventory summary" icon={Settings2} className="bg-white border-gray-100">
            <DetailRow label="Assets" value={String(snapshot.assets.length)} />
            <DetailRow label="Employees" value={String(snapshot.employees.length)} />
            <DetailRow label="Assignments" value={String(snapshot.assignments.length)} />
            <DetailRow label="History events" value={String(snapshot.history.length)} />
          </DetailCard>
        </div>
      )}

      {settingsTab === 'data' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <DetailCard
            title="Storage mode"
            icon={isCloudSyncEnabled() ? Cloud : HardDrive}
            className="bg-white border-gray-100 lg:col-span-2"
          >
            <DetailRow label="Current mode" value={getStorageModeLabel(storageMode)} />
            {isCloudSyncEnabled() ? (
              <>
                <DetailRow label="Workspace ID" value={<span className="font-mono text-xs">{WORKSPACE_ID}</span>} />
                <DetailRow
                  label="Connection"
                  value={
                    <span className={connectionOk ? 'text-emerald-700' : 'text-amber-700'}>
                      {connectionOk == null ? 'Checking…' : connectionOk ? 'Connected' : 'Not connected'}
                    </span>
                  }
                />
                {lastSyncAt && (
                  <DetailRow
                    label="Last synced"
                    value={formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}
                  />
                )}
                {lastSyncError && (
                  <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                    {lastSyncError}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void handleCloudSync()}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`${iconSize.sm} ${busy === 'sync' ? 'animate-spin' : ''}`} />
                    Push to cloud
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void handleCloudPull()}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <CloudOff className={iconSize.sm} />
                    Pull from cloud
                  </button>
                </div>
              </>
            ) : (
              <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Cloud sync is not configured. Each browser keeps its own copy. Set{' '}
                <code className="rounded bg-amber-100/80 px-1">VITE_SUPABASE_URL</code> and{' '}
                <code className="rounded bg-amber-100/80 px-1">VITE_SUPABASE_ANON_KEY</code> on your host, then
                redeploy. See DEPLOYMENT.md.
              </p>
            )}
          </DetailCard>
        </div>
      )}

      {settingsTab === 'backup' && (
        <DetailCard title="Backup & restore" icon={Database} className="bg-white border-gray-100 max-w-2xl">
          <p className="text-sm text-gray-600">
            Download a full JSON snapshot of assets, employees, assignments, history, and settings. Use before major
            imports or upgrades.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleBackup}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Download className={iconSize.sm} />
              Download backup
            </button>
            <button
              type="button"
              disabled={busy === 'restore'}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Upload className={iconSize.sm} />
              Restore backup
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void handleRestore(file);
              }}
            />
          </div>
        </DetailCard>
      )}

      {settingsTab === 'about' && (
        <DetailCard title="Production handover" icon={Shield} className="bg-white border-gray-100 max-w-3xl">
          <DetailRow label="Application" value={APP_NAME} />
          <DetailRow label="Version" value={APP_VERSION} />
          <ul className="space-y-2 pt-2 text-sm text-gray-600">
            <li>• Deploy the <code className="text-xs bg-gray-100 px-1 rounded">dist/</code> folder to Netlify, Vercel, or any static host.</li>
            <li>• Configure Supabase so all users share the same inventory on your hosted URL.</li>
            <li>• Run <code className="text-xs bg-gray-100 px-1 rounded">supabase/schema.sql</code> once in Supabase SQL editor.</li>
            <li>• Use Excel export/import for spreadsheet workflows — matched by serial number.</li>
            <li>• Schedule JSON backups before bulk changes.</li>
          </ul>
          <p className="pt-3 text-xs text-gray-400">
            Documentation: README.md · DEPLOYMENT.md · HANDOVER.md
          </p>
        </DetailCard>
      )}

    </div>
  );
}
