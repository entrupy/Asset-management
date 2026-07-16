import { APP_NAME } from '../config';

const SETTINGS_KEY = 'assettrack-it-settings-v1';

export type AppSettings = {
  organizationName: string;
  adminDisplayName: string;
};

const DEFAULTS: AppSettings = {
  organizationName: APP_NAME,
  adminDisplayName: 'IT Admin',
};

let settings: AppSettings = { ...DEFAULTS };

function loadSettings(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    settings = { ...DEFAULTS, ...parsed };
  } catch {
    /* ignore */
  }
}

function saveSettings(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* quota */
  }
}

loadSettings();

export function getSettings(): Readonly<AppSettings> {
  return settings;
}

export function updateSettings(patch: Partial<AppSettings>): void {
  settings = { ...settings, ...patch };
  saveSettings();
}

export function getPerformedBy(): string {
  const name = settings.adminDisplayName.trim();
  return name || DEFAULTS.adminDisplayName;
}
