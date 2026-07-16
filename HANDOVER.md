# Handover Checklist — AssetTrack IT

Use this document when transferring the application to an operations or IT team.

## What you are receiving

| Item | Description |
|------|-------------|
| **Application** | React SPA for IT asset + employee tracking |
| **Data model** | Assets, employees, assignments, audit history |
| **Import/Export** | Excel (.xlsx) with Assets + Assignments sheets; JSON full backup |
| **Storage** | Browser local (demo) or Supabase cloud (production) |

## Day-one setup (production)

1. **Deploy** — Follow `DEPLOYMENT.md` (Netlify or Vercel recommended).
2. **Supabase** — Run `supabase/schema.sql`; set `VITE_SUPABASE_*` env vars; redeploy.
3. **Settings** — Set organization name and admin display name (used in audit trail).
4. **Seed data** — Import employees Excel, then assets Excel (or restore a JSON backup).
5. **Verify** — Two team members open the hosted URL and confirm they see the same inventory.

## Architecture overview

```
Browser (React SPA)
    │
    ├─ localStorage (cache / offline fallback)
    │
    └─ Supabase workspace_snapshots (when env configured)
           └── one JSON row per VITE_WORKSPACE_ID
```

- UI components read/write through `src/data/localStore.ts`.
- Changes persist to localStorage immediately and sync to Supabase (1.2s debounce) when cloud mode is active.
- On load, cloud data replaces local cache when Supabase is configured.

## Key files for maintainers

| Path | Purpose |
|------|---------|
| `src/data/localStore.ts` | Core data operations |
| `src/data/cloudSync.ts` | Supabase sync |
| `src/lib/assetExcelImport.ts` | Asset Excel import/export |
| `src/lib/employeeExcelImport.ts` | Employee Excel import/export |
| `src/lib/backup.ts` | JSON backup format |
| `src/components/Settings.tsx` | Org settings, backup, cloud controls |
| `supabase/schema.sql` | Database schema |

## User workflows

### Daily operations
- **Assets** — Add, edit, assign, return, bulk delete, filter by type/location/status.
- **Employees** — Directory with assignment history.
- **Dashboard** — Fleet KPIs, warranty risk, exports.

### Bulk update
1. Dashboard → Export assets.
2. Edit spreadsheet (match by Serial Number).
3. Assets → Import Excel.

### Disaster recovery
1. Settings → Download backup (JSON).
2. After incident → Settings → Restore backup.

## Security checklist (before go-live)

- [ ] Supabase RLS policies reviewed (default is open for anon key).
- [ ] Anon key is only the **public** key (never service role in the browser).
- [ ] HTTPS enforced by host (Netlify/Vercel default).
- [ ] `noindex` meta tag reviewed if the app should not appear in search engines (`index.html`).
- [ ] Backup procedure documented for your team (weekly JSON + monthly Excel).

## Known limitations (v1.0)

- No user login / RBAC — all visitors with the URL can edit (mitigate with host-level auth or Supabase Auth in a future release).
- No URL deep-linking to specific assets (tab state is in-memory).
- Data conflict resolution is last-write-wins on cloud sync.
- Excel import requires employees to exist before assignment rows can link.

## Support contacts

| Role | Action |
|------|--------|
| **Hosting** | Netlify/Vercel dashboard + `DEPLOYMENT.md` |
| **Database** | Supabase dashboard + `supabase/schema.sql` |
| **Application bugs** | Source repo issues / development team |

## Version

- Application version: see `src/config.ts` (`APP_VERSION`)
- Handover document: July 2026
