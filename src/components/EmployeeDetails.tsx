import React, { useState, useEffect } from 'react';
import { subscribe, getState, deleteAssignment, insertHistory } from '../data/localStore';
import { Timestamp } from '../lib/timestamp';
import { Asset, HistoryEvent, Employee, Assignment } from '../types';
import {
  X,
  History,
  User,
  Calendar,
  Tag,
  Info,
  Laptop,
  Monitor,
  Keyboard,
  Mouse,
  Package,
  Trash2,
  LayoutGrid,
  Briefcase,
  Clock,
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { cn, sortHistoryNewestFirst } from '../lib/utils';
import { iconSize } from '../lib/icons';
import AssetDetails from './AssetDetails';
import { TabBar, DetailCard, DetailRow, StatusBadge, type TabItem } from './ui/DetailTabs';
import { useConfirm } from './ui/ConfirmProvider';
import { toast } from '../lib/toast';

const TypeIcon = ({ type }: { type: string }) => {
  const t = (type || '').trim().toLowerCase();
  switch (t) {
    case 'laptop':
      return <Laptop className={iconSize.sm} />;
    case 'monitor':
      return <Monitor className={iconSize.sm} />;
    case 'keyboard':
      return <Keyboard className={iconSize.sm} />;
    case 'mouse':
      return <Mouse className={iconSize.sm} />;
    default:
      return <Package className={iconSize.sm} />;
  }
};

type EmployeeDetailTab = 'profile' | 'assets' | 'assignments' | 'activity';

function employeeStatusTone(status: Employee['status']) {
  if (status === 'Active') return 'success' as const;
  if (status === 'On Leave') return 'warning' as const;
  return 'danger' as const;
}

export default function EmployeeDetails({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const confirm = useConfirm();
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetDetail, setAssetDetail] = useState<Asset | null>(null);
  const [detailTab, setDetailTab] = useState<EmployeeDetailTab>('profile');

  useEffect(() => {
    setDetailTab('profile');
  }, [employee.id]);

  useEffect(() => {
    const sync = () => {
      const s = getState();
      setAssets(s.assets);
      setHistory(
        s.history
          .filter((h) => h.userId === employee.id || h.employeeId === employee.id)
          .sort(sortHistoryNewestFirst)
      );
      setAssignments(
        s.assignments
          .filter((a) => a.employeeId === employee.id)
          .sort((a, b) => b.assignedAt.toMillis() - a.assignedAt.toMillis())
      );
      setLoading(false);
    };
    sync();
    return subscribe(sync);
  }, [employee.id]);

  const getAssetName = (id: string) => assets.find((a) => a.id === id)?.name || 'Unknown Asset';
  const getAssetSerial = (id: string) => assets.find((a) => a.id === id)?.serialNumber || '—';
  const getAssetType = (id: string) => assets.find((a) => a.id === id)?.type || 'other';
  const getAssetById = (id: string) => assets.find((a) => a.id === id);

  const activeAssets = assets.filter((a) => a.assignedTo === employee.id);
  const openAssignments = assignments.filter((a) => !a.returnedAt);

  const openAssetDetail = (assetId: string) => {
    const a = getAssetById(assetId);
    if (a) setAssetDetail(a);
  };

  const handleDeleteAssignment = async (asgn: Assignment) => {
    const assetName = getAssetName(asgn.assetId);
    const ok = await confirm({
      title: 'Delete assignment?',
      description: `Remove the assignment for ${assetName}. The asset checkout state will update from any remaining rows.`,
      confirmLabel: 'Delete assignment',
      variant: 'danger',
    });
    if (!ok) return;
    const removed = deleteAssignment(asgn.id);
    if (removed) {
      insertHistory({
        assetId: removed.assetId,
        type: 'assignment',
        event: 'Assignment deleted',
        details: `Assignment removed (${employee.name}; asset ${assetName}; assigned ${format(removed.assignedAt.toDate(), 'MMM d, yyyy')}${removed.returnedAt ? `; returned ${format(removed.returnedAt.toDate(), 'MMM d, yyyy')}` : '; was open'}).`,
        userId: removed.employeeId,
        employeeId: removed.employeeId,
        timestamp: Timestamp.now(),
      });
      toast('Assignment deleted.');
    }
  };

  const tabs: TabItem<EmployeeDetailTab>[] = [
    { id: 'profile' as const, label: 'Profile', icon: LayoutGrid },
    { id: 'assets' as const, label: 'Assigned assets', icon: Tag, count: activeAssets.length },
    { id: 'assignments' as const, label: 'Assignments', icon: Calendar, count: assignments.length },
    { id: 'activity' as const, label: 'Activity', icon: History, count: history.length },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0">
              <User className={iconSize.hero} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900 truncate">{employee.name || 'Unnamed'}</h2>
                <StatusBadge label={employee.status} tone={employeeStatusTone(employee.status)} />
              </div>
              <p className="text-sm text-gray-500 font-mono truncate">
                {employee.employeeNumber || '—'} • {employee.department || 'General'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors shrink-0">
            <X className={iconSize.hero} />
          </button>
        </div>

        <div className="px-8 pt-5 pb-0 border-b border-gray-100 bg-white">
          <TabBar<EmployeeDetailTab> tabs={tabs} active={detailTab} onChange={setDetailTab} />
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading employee details…</p>
          ) : detailTab === 'profile' ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <DetailCard title="Contact & role" icon={Info}>
                <DetailRow label="Email" value={employee.email || '—'} />
                <DetailRow label="Employee ID" value={employee.employeeNumber || '—'} />
                <DetailRow label="Department" value={employee.department || '—'} />
                <DetailRow label="Location" value={employee.location || '—'} />
                <DetailRow label="Employee type" value={employee.employeeType ?? 'Regular'} />
              </DetailCard>

              <DetailCard title="Employment" icon={Briefcase}>
                <DetailRow label="Status" value={<StatusBadge label={employee.status} tone={employeeStatusTone(employee.status)} />} />
                <DetailRow
                  label="Joined"
                  value={format(employee.createdAt.toDate(), 'MMM dd, yyyy')}
                />
                <DetailRow
                  label="Last updated"
                  value={format(employee.updatedAt.toDate(), 'MMM dd, yyyy HH:mm')}
                />
                <DetailRow label="Active assets" value={String(activeAssets.length)} />
                <DetailRow label="Open assignments" value={String(openAssignments.length)} />
              </DetailCard>
            </div>
          ) : detailTab === 'assets' ? (
            <section>
              <p className="mb-4 text-sm text-gray-500">
                Hardware currently checked out to this employee. Click a row to view full asset details.
              </p>
              <div className="space-y-3">
                {activeAssets.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400 italic">
                    No assets currently assigned.
                  </p>
                ) : (
                  activeAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setAssetDetail(asset)}
                      className="w-full text-left rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 flex items-center gap-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <div className="p-2.5 bg-white rounded-xl text-indigo-600 shadow-sm">
                        <TypeIcon type={asset.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-indigo-900 truncate">{asset.name}</p>
                        <p className="text-xs text-indigo-500 font-mono truncate">{asset.serialNumber}</p>
                      </div>
                      <StatusBadge label={asset.status} tone={asset.status === 'Assigned' ? 'info' : 'neutral'} />
                    </button>
                  ))
                )}
              </div>
            </section>
          ) : detailTab === 'assignments' ? (
            <section>
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3">Serial</th>
                      <th className="px-4 py-3">Assigned</th>
                      <th className="px-4 py-3">Returned / Due</th>
                      <th className="px-4 py-3">Condition</th>
                      <th className="px-4 py-3 w-14 text-right"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {assignments.map((asgn) => (
                      <tr key={asgn.id} className={!asgn.returnedAt ? 'bg-indigo-50/40' : undefined}>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={!getAssetById(asgn.assetId)}
                            onClick={() => openAssetDetail(asgn.assetId)}
                            className="group flex items-center gap-2 text-left rounded-lg hover:text-indigo-700 disabled:cursor-not-allowed"
                          >
                            <TypeIcon type={getAssetType(asgn.assetId)} />
                            <span className="font-medium text-gray-900 group-hover:underline">
                              {getAssetName(asgn.assetId)}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {getAssetSerial(asgn.assetId)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {format(asgn.assignedAt.toDate(), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {asgn.returnedAt
                            ? format(asgn.returnedAt.toDate(), 'MMM dd, yyyy')
                            : asgn.returnDate
                              ? `Due ${format(asgn.returnDate.toDate(), 'MMM dd, yyyy')}`
                              : 'Open'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px]">
                            {asgn.condition ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleDeleteAssignment(asgn)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete assignment"
                            >
                              <Trash2 className={iconSize.sm} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {assignments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-400 italic">
                          No assignment history for this employee.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section>
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                <Clock className={iconSize.sm} aria-hidden />
                Check-outs, returns, and related events involving this employee.
              </div>
              <div className="space-y-4">
                {history.length === 0 ? (
                  <p className="text-gray-400 text-sm italic py-8 text-center">No activity recorded yet.</p>
                ) : (
                  history.map((event) => {
                    const isReturn = (event.type || '').toLowerCase() === 'return';
                    const isAssignment = (event.type || '').toLowerCase() === 'assignment';
                    const bucketLabel = isReturn ? 'Return' : isAssignment ? 'Assignment' : 'Activity';
                    const bucketTone = isReturn
                      ? { dot: 'bg-sky-500', text: 'text-sky-600' }
                      : isAssignment
                        ? { dot: 'bg-indigo-500', text: 'text-indigo-600' }
                        : { dot: 'bg-slate-400', text: 'text-slate-600' };
                    return (
                      <div key={event.id} className="relative pl-6 pb-4 border-l border-gray-100 last:pb-0">
                        <div className={cn('absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full', bucketTone.dot)} />
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                          <div className="flex justify-between items-start mb-1 gap-3">
                            <span className={cn('text-xs font-bold uppercase tracking-wider', bucketTone.text)}>
                              {bucketLabel}
                              <span className="ml-1.5 font-semibold normal-case text-gray-500">
                                · {event.event ?? event.type}
                              </span>
                            </span>
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {format(event.timestamp.toDate(), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{event.details ?? event.description ?? '—'}</p>
                          {event.assetId && (
                            <button
                              type="button"
                              disabled={!getAssetById(event.assetId)}
                              onClick={() => openAssetDetail(event.assetId!)}
                              className="text-[10px] text-indigo-600 mt-2 hover:underline disabled:text-gray-400 disabled:no-underline"
                            >
                              Asset: {getAssetName(event.assetId)} ({getAssetSerial(event.assetId)})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}
        </div>
      </motion.div>

      {assetDetail && (
        <AssetDetails asset={assetDetail} onClose={() => setAssetDetail(null)} nestedOverlay />
      )}
    </div>
  );
}
