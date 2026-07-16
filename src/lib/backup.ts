import { format } from 'date-fns';
import { APP_NAME, APP_VERSION } from '../config';
import type { AppSettings } from '../data/settings';

export type BackupPayload = {
  version: number;
  appVersion: string;
  exportedAt: string;
  settings: AppSettings;
  data: {
    assets: unknown[];
    employees: unknown[];
    assignments: unknown[];
    history: unknown[];
  };
};

export function buildBackupPayload(
  settings: AppSettings,
  data: BackupPayload['data']
): BackupPayload {
  return {
    version: 1,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    data,
  };
}

export function downloadBackupJson(payload: BackupPayload): void {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${APP_NAME.toLowerCase().replace(/\s+/g, '-')}_backup_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseBackupFile(raw: string): BackupPayload {
  const parsed = JSON.parse(raw) as Partial<BackupPayload>;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid backup file.');
  }
  if (!parsed.data || typeof parsed.data !== 'object') {
    throw new Error('Backup file is missing inventory data.');
  }
  const data = parsed.data as BackupPayload['data'];
  if (!Array.isArray(data.assets) || !Array.isArray(data.employees)) {
    throw new Error('Backup file is missing assets or employees.');
  }
  return {
    version: parsed.version ?? 1,
    appVersion: parsed.appVersion ?? 'unknown',
    exportedAt: parsed.exportedAt ?? new Date().toISOString(),
    settings: parsed.settings ?? { organizationName: APP_NAME, adminDisplayName: 'IT Admin' },
    data: {
      assets: data.assets,
      employees: data.employees,
      assignments: Array.isArray(data.assignments) ? data.assignments : [],
      history: Array.isArray(data.history) ? data.history : [],
    },
  };
}
