# AssetTrack IT

Professional IT asset and employee inventory for hardware fleet tracking, assignments, warranty management, and Excel-based import/export.

**Production-ready static SPA** — deploy to Netlify, Vercel, or any static host. Optional **Supabase cloud sync** lets your whole team share one inventory on the same hosted URL.

## Features

- **Dashboard** — Fleet KPIs, warranty risk, utilization, recent activity
- **Assets** — Full lifecycle: inventory, assign, return, swap, repair, retire
- **Employees** — Directory with hardware assignment history
- **Excel import/export** — Round-trip by serial number (Assets + Assignments sheets)
- **Bulk operations** — Multi-select delete with filter awareness
- **Audit history** — Assignment and status events with admin attribution
- **Settings** — Organization profile, JSON backup/restore, cloud sync controls
- **Team cloud sync** — Optional Supabase backend (see below)

## Quick start (development)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Data is stored in the browser until Supabase is configured.

## Production deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for step-by-step hosting instructions.

See **[HANDOVER.md](./HANDOVER.md)** for the operations handover checklist.

### Team shared data (recommended)

Without cloud configuration, **each browser has its own data**. To fix this for production:

1. Create a [Supabase](https://supabase.com) project (free tier works).
2. Run `supabase/schema.sql` in the SQL editor.
3. Set environment variables on your host:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_WORKSPACE_ID=production
```

4. Rebuild and redeploy.

All users on your hosted link will then share the same asset inventory.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BASE_PATH` | No | Base URL path (default `/`) |
| `VITE_SUPABASE_URL` | For cloud | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | For cloud | Supabase anon key |
| `VITE_WORKSPACE_ID` | No | Workspace identifier (default `default`) |

Copy `.env.example` to `.env` for local production builds.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run typecheck` | TypeScript validation |
| `npm run clean` | Remove `dist/` |

## Data & backups

| Method | Use case |
|--------|----------|
| **Supabase cloud** | Live team sync (production) |
| **JSON backup** | Settings → full snapshot for DR |
| **Excel export** | Audits, spreadsheet edits, offline sharing |

## Tech stack

- React 19 + TypeScript + Vite 6
- Tailwind CSS 4
- react-hook-form + Zod
- SheetJS (xlsx) for Excel
- Supabase (optional cloud sync)

## License

Private / internal use — confirm licensing with your organization before external distribution.
