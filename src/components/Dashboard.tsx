import React, { useState, useEffect, useMemo } from 'react';
import { subscribe, getState } from '../data/localStore';
import {
  Asset,
  ASSET_LIST_STATUS_RETIRED_STOLEN,
  ASSET_LIST_WARRANTY_EXPIRING_30D,
  ASSET_LIST_FIELD_EMPTY,
  ASSET_LIST_MACBOOK_ANY,
  AssetListNavigateFilters,
  EmployeeListNavigateFilters,
  Assignment,
  Employee,
  HistoryEvent,
} from '../types';
import {
  Package,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Shield,
  Wrench,
  Activity,
  MapPin,
  Layers,
  LayoutGrid,
  ArrowUpRight,
  Sparkles,
  ShieldAlert,
  X,
  Target,
  UserX,
  ClipboardList,
  Laptop,
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInCalendarDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn, sortHistoryNewestFirst } from '../lib/utils';
import { iconSize } from '../lib/icons';
import { downloadAssetsWorkbook } from '../lib/assetExcelImport';
import { downloadEmployeesCsv } from '../lib/employeeExcelImport';

const MS_DAY = 86_400_000;

function uniqueLocations(assets: Asset[]): string[] {
  const set = new Set<string>();
  for (const a of assets) {
    const loc = a.location?.trim();
    if (loc) set.add(loc);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Normalized type key → display label (uses real strings from your catalog). */
function isMacBookAsset(a: Asset): boolean {
  return `${a.name || ''} ${a.model || ''}`.toLowerCase().includes('macbook');
}

function typeDistributionLabel(normalizedKey: string): string {
  if (!normalizedKey) return 'Unspecified type';
  if (normalizedKey === 'mouse') return 'Mice';
  return normalizedKey.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function historyLabel(event: HistoryEvent): string {
  return (event.event ?? event.type ?? 'Event').replace(/_/g, ' ');
}

function activityAccent(event: HistoryEvent): string {
  const t = (event.type || '').toLowerCase();
  if (t === 'return') return 'bg-sky-500';
  const label = `${event.event ?? ''} ${event.type ?? ''} ${event.description ?? ''} ${event.details ?? ''}`.toLowerCase();
  if (label.includes('assign') || label.includes('swap')) return 'bg-emerald-500';
  if (label.includes('return') || label.includes('inventory')) return 'bg-sky-500';
  if (label.includes('retire') || label.includes('stolen') || label.includes('delete')) return 'bg-rose-500';
  if (label.includes('repair')) return 'bg-amber-500';
  if (label.includes('warranty') || label.includes('care')) return 'bg-violet-500';
  return 'bg-indigo-500';
}

const MODEL_BAR_COLORS = [
  'bg-indigo-500',
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-sky-500',
  'bg-teal-500',
  'bg-amber-500',
];

export default function Dashboard({
  onOpenAssets,
  onOpenEmployees,
}: {
  onOpenAssets?: (filters?: Partial<AssetListNavigateFilters>) => void;
  onOpenEmployees?: (filters?: Partial<EmployeeListNavigateFilters>) => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributionTab, setDistributionTab] = useState<'type' | 'location' | 'model'>('type');
  const [sidePanel, setSidePanel] = useState<'activity' | 'team' | null>(null);

  useEffect(() => {
    if (!sidePanel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidePanel(null);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [sidePanel]);

  useEffect(() => {
    const sync = () => {
      const s = getState();
      setAssets(s.assets);
      setEmployees(s.employees);
      setAssignments(s.assignments);
      const weekAgo = Date.now() - 7 * MS_DAY;
      setHistory(
        s.history
          .filter((h) => h.timestamp.toMillis() > weekAgo)
          .sort(sortHistoryNewestFirst)
      );
      setLoading(false);
    };
    sync();
    return subscribe(sync);
  }, []);

  const locations = useMemo(() => uniqueLocations(assets), [assets]);

  const typeDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets) {
      const key = (a.type || '').trim().toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([key, count]) => ({
        key,
        count,
        label: typeDistributionLabel(key),
        filterType: key,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [assets]);

  const counts = useMemo(() => {
    const total = assets.length;
    const inventory = assets.filter((a) => a.status === 'Inventory').length;
    const assigned = assets.filter((a) => a.status === 'Assigned').length;
    const repaired = assets.filter((a) => a.status === 'Repaired').length;
    const retired = assets.filter((a) => a.status === 'Retired').length;
    const stolen = assets.filter((a) => a.status === 'Stolen').length;
    const warrantyActive = assets.filter((a) => a.warrantyStatus === 'Active').length;
    const warrantyExpired = assets.filter((a) => a.warrantyStatus === 'Expired').length;
    const warrantyNA = assets.filter((a) => a.warrantyStatus === 'N/A').length;
    const activeEmployees = employees.filter((e) => e.status === 'Active').length;
    const contractors = employees.filter((e) => (e.employeeType ?? 'Regular') === 'Contract').length;
    return {
      total,
      inventory,
      assigned,
      repaired,
      retired,
      stolen,
      retiredStolen: retired + stolen,
      warrantyActive,
      warrantyExpired,
      warrantyNA,
      activeEmployees,
      contractors,
    };
  }, [assets, employees]);

  const utilizationPct = useMemo(() => {
    if (assets.length === 0) return 0;
    return Math.round((counts.assigned / assets.length) * 100);
  }, [assets.length, counts.assigned]);

  const expiringSoon = useMemo(
    () =>
      assets.filter((a) => {
        if (!a.warrantyExpiry) return false;
        const days = (a.warrantyExpiry.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return days > 0 && days < 30;
      }),
    [assets]
  );

  const appleCareExpiringSorted = useMemo(
    () =>
      [...expiringSoon].sort(
        (a, b) => (a.warrantyExpiry?.toMillis() ?? 0) - (b.warrantyExpiry?.toMillis() ?? 0)
      ),
    [expiringSoon]
  );

  const expiredWarrantyAssets = useMemo(
    () => assets.filter((a) => a.warrantyStatus === 'Expired').slice(0, 4),
    [assets]
  );

  const modelDistribution = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assets) {
      const key = (a.model || '').trim() || 'Unspecified model';
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }, [assets]);

  const assignmentActivityWeek = useMemo(
    () =>
      history.filter((h) => {
        const t = `${h.event ?? ''} ${h.type ?? ''} ${h.details ?? ''} ${h.description ?? ''}`.toLowerCase();
        return t.includes('assign');
      }).length,
    [history]
  );

  const recentEmployees = useMemo(
    () => [...employees].sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis()).slice(0, 6),
    [employees]
  );

  const historyPreview = useMemo(() => history.slice(0, 10), [history]);

  const assignedAssetCount = counts.assigned;

  const checkinsThisWeek = useMemo(
    () =>
      history.filter((h) => {
        const t = `${h.event ?? ''} ${h.type ?? ''} ${h.details ?? ''}`.toLowerCase();
        return t.includes('return') || t.includes('inventory') || t.includes('check-in');
      }).length,
    [history]
  );

  const activeEmployeesWithoutAsset = useMemo(
    () =>
      employees.filter(
        (e) => e.status === 'Active' && !assets.some((a) => a.assignedTo === e.id)
      ),
    [employees, assets]
  );

  const readyInventory = useMemo(
    () => assets.filter((a) => a.status === 'Inventory' && !a.assignedTo),
    [assets]
  );

  const topInventoryLocations = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of readyInventory) {
      const loc = a.location?.trim() || 'Unspecified';
      map.set(loc, (map.get(loc) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [readyInventory]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const statTiles = useMemo(() => {
    const mb = assets.filter(isMacBookAsset);
    const mac = {
      total: mb.length,
      inventory: mb.filter((a) => a.status === 'Inventory').length,
      assigned: mb.filter((a) => a.status === 'Assigned').length,
      repaired: mb.filter((a) => a.status === 'Repaired').length,
      retiredStolen: mb.filter((a) => a.status === 'Retired' || a.status === 'Stolen').length,
    };
    const macbookFilter = { filterMacBookLine: ASSET_LIST_MACBOOK_ANY } as const;
    return [
      {
        label: 'MacBooks (catalog)',
        value: mac.total,
        icon: Package,
        tone: 'from-slate-500 to-slate-600',
        ring: 'ring-slate-200/80',
        description: `${counts.total} devices in catalog (all types)`,
        filter: macbookFilter,
      },
      {
        label: 'MacBooks in inventory',
        value: mac.inventory,
        icon: CheckCircle,
        tone: 'from-emerald-500 to-teal-600',
        ring: 'ring-emerald-200/80',
        description: `${counts.inventory} in inventory (all types)`,
        filter: { ...macbookFilter, filterStatus: 'Inventory' as const },
      },
      {
        label: 'MacBooks assigned',
        value: mac.assigned,
        icon: Clock,
        tone: 'from-indigo-500 to-violet-600',
        ring: 'ring-indigo-200/80',
        description: `${counts.assigned} assigned (all types)`,
        filter: { ...macbookFilter, filterStatus: 'Assigned' as const },
      },
      {
        label: 'MacBooks in repair',
        value: mac.repaired,
        icon: Wrench,
        tone: 'from-amber-500 to-orange-600',
        ring: 'ring-amber-200/80',
        description: `${counts.repaired} in repair (all types)`,
        filter: { ...macbookFilter, filterStatus: 'Repaired' as const },
      },
      {
        label: 'MacBooks retired / stolen',
        value: mac.retiredStolen,
        icon: AlertCircle,
        tone: 'from-rose-500 to-red-600',
        ring: 'ring-rose-200/80',
        description: `${counts.retired} retired · ${counts.stolen} stolen (all types)`,
        filter: { ...macbookFilter, filterStatus: ASSET_LIST_STATUS_RETIRED_STOLEN },
      },
    ] as const;
  }, [counts, assets]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading your workspace…</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 pb-8 sm:space-y-8 sm:pb-12">
      {assets.length === 0 && (
        <section className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Getting started</p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">Set up your production inventory</h2>
              <p className="mt-2 max-w-2xl text-sm text-gray-600">
                Import employees first, then import assets from Excel. Configure team cloud sync in Settings so
                everyone on your hosted link sees the same data.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {onOpenEmployees && (
                <button
                  type="button"
                  onClick={() => onOpenEmployees?.()}
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
                >
                  Add employees
                </button>
              )}
              {onOpenAssets && (
                <button
                  type="button"
                  onClick={() => onOpenAssets()}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Go to assets
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-4xl bg-linear-to-br from-indigo-600 via-violet-600 to-indigo-800 text-white shadow-2xl shadow-indigo-900/25"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 p-6 sm:gap-8 sm:p-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-100 backdrop-blur-sm">
              <Sparkles className={cn(iconSize.xs, 'text-amber-200')} />
              Live overview
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              {greeting}{' '}
              <span className="text-indigo-100/90">— here is your fleet at a glance.</span>
            </h1>
            <p className="text-sm leading-relaxed text-indigo-100/90 md:text-base">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
              {counts.total > 0 && (
                <>
                  {' '}
                  · <span className="font-semibold text-white">{utilizationPct}%</span> of assets assigned
                  {assignmentActivityWeek > 0 && (
                    <>
                      {' '}
                      · <span className="font-semibold text-white">{assignmentActivityWeek}</span> assignment-related
                      events this week
                    </>
                  )}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setSidePanel('activity')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <Activity className={iconSize.sm} />
                Activity
                {history.length > 0 && (
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                    {history.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSidePanel('team')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <Users className={iconSize.sm} />
                Team
                {employees.length > 0 && (
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                    {employees.length}
                  </span>
                )}
              </button>
            </div>
            <div className="icon-toolbar sm:justify-end">
              <button
                type="button"
                onClick={() => downloadAssetsWorkbook(assets, employees, assignments)}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <ArrowUpRight className={iconSize.sm} />
                Export assets
              </button>
              <button
                type="button"
                onClick={() => downloadEmployeesCsv(employees)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-lg shadow-indigo-950/20 transition hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Export team
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {statTiles.map((stat, i) => (
          <motion.button
            key={stat.label}
            type="button"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.35 }}
            onClick={() => onOpenAssets?.(stat.filter)}
            className={cn(
              'group relative overflow-hidden rounded-2xl border border-slate-100/90 bg-white p-5 text-left shadow-sm ring-1 ring-transparent transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
              stat.ring
            )}
          >
            <div
              className={cn(
                'icon-stat-wrap bg-linear-to-br text-white shadow-md',
                stat.tone
              )}
            >
              <stat.icon className={iconSize.tile} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
            <motion.p
              key={`${stat.label}-${stat.value}`}
              initial={{ opacity: 0.4, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-slate-900"
            >
              {stat.value}
            </motion.p>
            <p className="mt-2 text-xs leading-snug text-slate-500">{stat.description}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 opacity-0 transition group-hover:opacity-100">
              Open in assets <ArrowUpRight className={iconSize.xs} />
            </span>
          </motion.button>
        ))}

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          onClick={() => onOpenEmployees?.()}
            className="group relative overflow-hidden rounded-2xl border border-slate-100/90 bg-linear-to-br from-white to-indigo-50/60 p-5 text-left shadow-sm ring-1 ring-indigo-100/80 transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <div className="icon-stat-wrap bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-md">
            <Users className={iconSize.tile} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Team</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{employees.length}</p>
          <p className="mt-2 text-xs text-slate-500">
            <span className="font-semibold text-emerald-600">{counts.activeEmployees}</span> active
            {counts.contractors > 0 && (
              <>
                {' '}
                · <span className="font-semibold text-violet-600">{counts.contractors}</span> contractors
              </>
            )}
          </p>
          {onOpenEmployees && (
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 opacity-0 transition group-hover:opacity-100">
              View employees <ArrowUpRight className={iconSize.xs} />
            </span>
          )}
        </motion.button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-32px' }}
          transition={{ duration: 0.4 }}
          className="min-w-0"
        >
          <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="icon-section-title text-base sm:text-lg font-bold text-slate-900">
                <TrendingUp className={cn(iconSize.tile, 'text-indigo-600')} />
                Asset distribution
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                Tabs · click a row to filter the asset list
              </span>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 border-b border-slate-100 custom-scrollbar">
              {(
                [
                  { id: 'type' as const, label: 'By type', icon: Layers, count: typeDistribution.length },
                  { id: 'location' as const, label: 'By location', icon: MapPin, count: locations.length },
                  { id: 'model' as const, label: 'By model', icon: LayoutGrid, count: modelDistribution.length },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDistributionTab(tab.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px',
                    distributionTab === tab.id
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-800'
                      : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  )}
                >
                  <tab.icon className={cn(iconSize.sm, 'opacity-80')} />
                  {tab.label}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                      distributionTab === tab.id ? 'bg-indigo-200/80 text-indigo-900' : 'bg-slate-200/80 text-slate-600'
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 min-h-48">
              {distributionTab === 'type' && (
                <div className="space-y-3">
                  {typeDistribution.length === 0 ? (
                    <p className="py-6 text-center text-sm italic text-slate-400">No assets yet — types appear from what you add.</p>
                  ) : (
                    typeDistribution.map((row, idx) => {
                      const pct = assets.length > 0 ? (row.count / assets.length) * 100 : 0;
                      return (
                        <button
                          key={row.key || '__empty__'}
                          type="button"
                          onClick={() => onOpenAssets?.({ filterType: row.filterType })}
                          className="w-full rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <div className="mb-1 flex justify-between gap-2 text-sm">
                            <span className="truncate font-medium text-slate-700">{row.label}</span>
                            <span className="shrink-0 tabular-nums font-bold text-slate-900">{row.count}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.04 * idx, duration: 0.5, ease: 'easeOut' }}
                              className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500"
                            />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {distributionTab === 'location' && (
                <div className="max-h-[280px] space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
                  {locations.length === 0 ? (
                    <p className="py-6 text-center text-sm italic text-slate-400">No locations on assets yet.</p>
                  ) : (
                    locations.map((loc, idx) => {
                      const count = assets.filter((a) => a.location === loc).length;
                      const pct = assets.length > 0 ? (count / assets.length) * 100 : 0;
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => onOpenAssets?.({ filterLocation: loc })}
                          className="w-full rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="truncate font-medium text-slate-600">{loc}</span>
                            <span className="shrink-0 tabular-nums font-bold text-slate-900">{count}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.03 * idx, duration: 0.45, ease: 'easeOut' }}
                              className="h-full rounded-full bg-linear-to-r from-sky-500 to-cyan-500"
                            />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {distributionTab === 'model' && (
                <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                  {modelDistribution.length === 0 ? (
                    <p className="py-6 text-center text-sm italic text-slate-400">Add assets to see model mix.</p>
                  ) : (
                    modelDistribution.map(([model, count], idx) => {
                      const pct = assets.length > 0 ? (count / assets.length) * 100 : 0;
                      const bar = MODEL_BAR_COLORS[idx % MODEL_BAR_COLORS.length];
                      return (
                        <button
                          key={model}
                          type="button"
                          onClick={() =>
                            onOpenAssets?.({
                              filterModel: model === 'Unspecified model' ? ASSET_LIST_FIELD_EMPTY : model,
                            })
                          }
                          className="w-full rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <div className="mb-1 flex justify-between gap-2 text-sm">
                            <span className="truncate font-medium text-slate-700">{model}</span>
                            <span className="shrink-0 tabular-nums text-slate-900">{count}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.04 * idx, duration: 0.5 }}
                              className={cn('h-full rounded-full', bar)}
                            />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-32px' }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="min-w-0"
        >
          <div className="h-full rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="icon-section-title mb-5 text-base sm:text-lg font-bold text-slate-900">
              <Shield className={cn(iconSize.tile, 'text-indigo-600')} />
              Warranty & risk
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => onOpenAssets?.({ filterWarranty: 'Active' })}
                className="rounded-2xl bg-linear-to-br from-emerald-50 to-teal-50/80 p-4 text-left ring-1 ring-emerald-100/80 transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Active</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-900">{counts.warrantyActive}</p>
              </button>
              <button
                type="button"
                onClick={() => onOpenAssets?.({ filterWarranty: 'Expired' })}
                className="rounded-2xl bg-linear-to-br from-rose-50 to-orange-50/50 p-4 text-left ring-1 ring-rose-100/80 transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">Expired</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-rose-900">{counts.warrantyExpired}</p>
              </button>
              <button
                type="button"
                onClick={() => onOpenAssets?.({ filterWarranty: 'N/A' })}
                className="rounded-2xl bg-slate-50 p-4 text-left ring-1 ring-slate-200/80 transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">N/A</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800">{counts.warrantyNA}</p>
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-100">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Fleet utilization</span>
                <span className="font-bold text-indigo-600">{utilizationPct}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-200/80">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${utilizationPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-linear-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
                />
              </div>
              <p className="mt-2 text-[11px] leading-snug text-slate-500">
                Assigned devices vs total catalog. Open the Assigned tile in the overview row to review active
                assignments.
              </p>
            </div>

            {expiredWarrantyAssets.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Sample of expired (open list)
                </p>
                <div className="flex flex-wrap gap-2">
                  {expiredWarrantyAssets.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onOpenAssets?.({ filterWarranty: 'Expired' })}
                      className="rounded-lg border border-rose-100 bg-rose-50/80 px-2.5 py-1 text-xs font-medium text-rose-900 transition hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.section>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-32px' }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="min-w-0 rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="icon-section-title text-base font-bold text-slate-900 sm:text-lg">
              <ShieldAlert className={cn(iconSize.tile, 'text-amber-600')} />
              AppleCare expiring soon
            </h2>
            <p className="mt-1 text-xs leading-snug text-slate-500 sm:text-sm">
              Assets whose coverage end date (warranty and AppleCare) falls in the next 30 days — same filter as
              the asset list.
            </p>
          </div>
          <span className="shrink-0 self-start rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
            {appleCareExpiringSorted.length} asset{appleCareExpiringSorted.length === 1 ? '' : 's'}
          </span>
        </div>
        {appleCareExpiringSorted.length === 0 ? (
          <p className="text-sm italic text-slate-400">
            No assets with AppleCare or warranty coverage ending in the next 30 days.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {appleCareExpiringSorted.map((a) => {
                const exp = a.warrantyExpiry!.toDate();
                const daysLeft = differenceInCalendarDays(exp, new Date());
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onOpenAssets?.({ filterWarranty: ASSET_LIST_WARRANTY_EXPIRING_30D })}
                    className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-amber-100/80 bg-amber-50/40 px-3 py-2.5 text-left text-sm transition hover:bg-amber-50/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 truncate font-semibold text-slate-900">{a.name}</span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-amber-900">
                        {format(exp, 'MMM d, yyyy')}
                      </span>
                    </div>
                    <span className="truncate text-xs text-slate-600">
                      <span className="font-mono text-slate-500">{a.serialNumber}</span>
                      {a.model ? <span className="text-slate-500"> · {a.model}</span> : null}
                    </span>
                    <span className="text-[11px] font-semibold text-amber-800">
                      {daysLeft} calendar day{daysLeft === 1 ? '' : 's'} left
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => onOpenAssets?.({ filterWarranty: ASSET_LIST_WARRANTY_EXPIRING_30D })}
              className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl border border-amber-200/80 bg-amber-50/50 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-900 transition hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:w-auto sm:min-w-48 sm:px-6"
            >
              Open in assets
              <ArrowUpRight className={iconSize.xs} />
            </button>
          </>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-24px' }}
        transition={{ duration: 0.4 }}
        className="min-w-0 rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="icon-section-title text-base font-bold text-slate-900 sm:text-lg">
              <Target className={cn(iconSize.tile, 'text-indigo-600')} />
              Fleet priorities
            </h2>
            <p className="mt-1 text-xs leading-snug text-slate-500 sm:text-sm">
              Actionable snapshot — gaps, assignments, and compliance risks. Click any metric to drill in.
            </p>
          </div>
          <span className="shrink-0 self-start rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800">
            Updated live
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-linear-to-br from-slate-50 to-white p-5 ring-1 ring-slate-100/80">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <ClipboardList className={iconSize.md} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Assignment pulse</p>
                <p className="text-sm font-semibold text-slate-800">Check-outs &amp; returns</p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => onOpenAssets?.({ filterStatus: 'Assigned' })}
                className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left ring-1 ring-slate-100 transition hover:ring-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span className="text-sm text-slate-600">Assigned assets</span>
                <span className="text-2xl font-bold tabular-nums text-indigo-700">{assignedAssetCount}</span>
              </button>
              <button
                type="button"
                onClick={() => setSidePanel('activity')}
                className="flex w-full items-center justify-between rounded-xl bg-emerald-50/80 px-4 py-3 text-left ring-1 ring-emerald-100 transition hover:ring-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <span className="text-sm text-emerald-800">Check-ins this week</span>
                <span className="text-2xl font-bold tabular-nums text-emerald-700">{checkinsThisWeek}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAssets?.({ filterStatus: 'Assigned' })}
                className="flex w-full items-center justify-between rounded-xl bg-violet-50/60 px-4 py-3 text-left ring-1 ring-violet-100 transition hover:ring-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <span className="text-sm text-violet-800">Fleet utilization</span>
                <span className="text-2xl font-bold tabular-nums text-violet-700">{utilizationPct}%</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-linear-to-br from-emerald-50/40 to-white p-5 ring-1 ring-emerald-100/60">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Laptop className={iconSize.md} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Hardware coverage</p>
                <p className="text-sm font-semibold text-slate-800">People &amp; inventory</p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() =>
                  onOpenEmployees?.({ filterStatus: 'Active', filterHardware: 'none' })
                }
                className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left ring-1 ring-slate-100 transition hover:ring-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <UserX className={cn(iconSize.sm, 'text-amber-600')} />
                  Active staff without hardware
                </span>
                <span className="text-2xl font-bold tabular-nums text-amber-700">
                  {activeEmployeesWithoutAsset.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onOpenAssets?.({ filterStatus: 'Inventory', filterAssignment: 'unassigned' })
                }
                className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left ring-1 ring-slate-100 transition hover:ring-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <span className="text-sm text-slate-600">Ready in inventory</span>
                <span className="text-2xl font-bold tabular-nums text-emerald-700">{readyInventory.length}</span>
              </button>
              {topInventoryLocations.length > 0 ? (
                <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-100">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Top stock locations</p>
                  <div className="flex flex-wrap gap-2">
                    {topInventoryLocations.map(([loc, count]) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() =>
                          onOpenAssets?.({
                            filterStatus: 'Inventory',
                            filterAssignment: 'unassigned',
                            filterLocation: loc === 'Unspecified' ? ASSET_LIST_FIELD_EMPTY : loc,
                          })
                        }
                        className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                      >
                        {loc} · {count}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs italic text-slate-400">No unassigned inventory on hand.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-linear-to-br from-amber-50/40 to-white p-5 ring-1 ring-amber-100/60">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <ShieldAlert className={iconSize.md} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Risk &amp; compliance</p>
                <p className="text-sm font-semibold text-slate-800">Warranty &amp; lifecycle</p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => onOpenAssets?.({ filterWarranty: 'Expired' })}
                className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left ring-1 ring-slate-100 transition hover:ring-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <span className="text-sm text-slate-600">Expired warranty</span>
                <span className="text-2xl font-bold tabular-nums text-rose-700">{counts.warrantyExpired}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAssets?.({ filterWarranty: ASSET_LIST_WARRANTY_EXPIRING_30D })}
                className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left ring-1 ring-slate-100 transition hover:ring-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span className="text-sm text-slate-600">Expiring in 30 days</span>
                <span className="text-2xl font-bold tabular-nums text-amber-700">{appleCareExpiringSorted.length}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAssets?.({ filterStatus: ASSET_LIST_STATUS_RETIRED_STOLEN })}
                className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left ring-1 ring-slate-100 transition hover:ring-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                <span className="text-sm text-slate-600">Retired / stolen</span>
                <span className="text-2xl font-bold tabular-nums text-slate-700">{counts.retiredStolen}</span>
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      <AnimatePresence>
        {sidePanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-120 bg-black/40 backdrop-blur-sm"
              onClick={() => setSidePanel(null)}
              aria-hidden
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="dashboard-panel-title"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed inset-y-0 right-0 z-130 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                <div>
                  <h2 id="dashboard-panel-title" className="text-lg font-bold text-slate-900">
                    {sidePanel === 'activity' ? 'Recent activity' : 'Team spotlight'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {sidePanel === 'activity'
                      ? 'Assignment and inventory events from the last 7 days'
                      : 'Recently updated employee profiles'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSidePanel(null)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                  aria-label="Close panel"
                >
                  <X className={iconSize.md} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                {sidePanel === 'activity' ? (
                  history.length === 0 ? (
                    <p className="py-12 text-center text-sm italic text-slate-400">No events in the last week.</p>
                  ) : (
                    <ul className="space-y-0">
                      {historyPreview.map((event, idx) => (
                        <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                          {idx < historyPreview.length - 1 && (
                            <div className="absolute left-[7px] top-3 h-full w-px bg-linear-to-b from-slate-200 to-transparent" />
                          )}
                          <div
                            className={cn(
                              'relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white',
                              activityAccent(event)
                            )}
                          />
                          <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-slate-50/40 px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-100">
                                {historyLabel(event)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {format(event.timestamp.toDate(), 'MMM d · HH:mm')}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-snug text-slate-700">
                              {event.details ?? event.description ?? '—'}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-400">{event.performedBy ?? 'System'}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )
                ) : employees.length === 0 ? (
                  <p className="py-12 text-center text-sm italic text-slate-400">No employees yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {recentEmployees.map((emp) => (
                      <li key={emp.id} className="flex items-center justify-between gap-3 py-4 first:pt-0">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{emp.name}</p>
                          <p className="truncate text-xs text-slate-500">
                            {emp.department || 'No department'} · {emp.employeeType ?? 'Regular'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Updated {formatDistanceToNow(emp.updatedAt.toDate(), { addSuffix: true })}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase',
                            emp.status === 'Active' && 'bg-emerald-50 text-emerald-700',
                            emp.status === 'On Leave' && 'bg-amber-50 text-amber-800',
                            emp.status === 'Inactive' && 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {emp.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {sidePanel === 'team' && onOpenEmployees && (
                <div className="border-t border-slate-100 p-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSidePanel(null);
                      onOpenEmployees();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Open full team directory
                    <ArrowUpRight className={iconSize.sm} />
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
