# Deployment Guide — AssetTrack IT

Production hosting for the static SPA in `dist/`.

## Prerequisites

- Node.js 20+
- Git repository access
- (Recommended) [Supabase](https://supabase.com) project for shared team data

## 1. Build

```bash
npm ci
npm run build
```

Output: `dist/` (upload this folder or connect CI to your host).

## 2. Environment variables

Copy `.env.example` to `.env` for local builds, or set variables in your host dashboard.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BASE_PATH` | No | Base URL path (default `/`) |
| `VITE_SUPABASE_URL` | For team sync | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | For team sync | Supabase anon/public key |
| `VITE_WORKSPACE_ID` | No | Workspace key (default `default`; use `production` for live) |

**Important:** Vite embeds `VITE_*` variables at **build time**. Change env vars → rebuild → redeploy.

## 3. Supabase setup (team shared data)

1. Create a Supabase project.
2. Open **SQL Editor** → paste and run `supabase/schema.sql`.
3. Copy **Project URL** and **anon public** key from **Settings → API**.
4. Add the three Supabase env vars to your host (see §2).
5. Redeploy the site.

All users visiting the hosted URL will load and save the same inventory (debounced sync on each change).

### Security note

The default SQL policy allows read/write with the anon key. For stricter production:

- Add Supabase Auth and row-level policies per organization, or
- Use a server/API layer with the service role key (not in the browser).

See `HANDOVER.md` for the security checklist.

## 4. Netlify

This repo includes `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

Steps:

1. Connect the Git repo in [Netlify](https://www.netlify.com/).
2. Set environment variables under **Site settings → Environment variables**.
3. Deploy. SPA redirects and security headers are configured in `netlify.toml`.

## 5. Vercel

`vercel.json` provides SPA rewrites. Set the same `VITE_*` env vars in the Vercel project settings, then deploy.

## 6. Other static hosts

Upload `dist/` contents. Configure fallback to `index.html` for client-side routes (single-page app).

## 7. Post-deploy verification

- [ ] App loads without console errors
- [ ] Settings → **Cloud connection** shows Connected (if Supabase configured)
- [ ] Add a test asset → second browser/incognito sees the same asset after refresh
- [ ] Export assets → re-import → data round-trips by serial number
- [ ] JSON backup downloads from Settings

## 8. Backups

- **Automatic:** Supabase stores the latest workspace snapshot when cloud sync is enabled.
- **Manual:** Settings → Download backup (full JSON).
- **Spreadsheet:** Dashboard → Export assets / Export team.

Schedule regular JSON or Excel exports before bulk imports.
