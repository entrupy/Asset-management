import React, { useState, useEffect, useMemo } from 'react';
import { subscribe, getState, deleteAssignment, insertHistory } from '../data/localStore';
import { Timestamp } from '../lib/timestamp';
import { Asset, HistoryEvent, Employee, Assignment } from '../types';
import {
  X,
  History,
  User,
  Calendar,
  Shield,
  Tag,
  Info,
  Pencil,
  StickyNote,
  Trash2,
  LayoutGrid,
  Clock,
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { cn, sortHistoryNewestFirst } from '../lib/utils';
import { iconSize } from '../lib/icons';
import AssignmentEditForm from './AssignmentEditForm';
import { TabBar, DetailCard, DetailRow, StatusBadge, type TabItem } from './ui/DetailTabs';
import { useConfirm } from './ui/ConfirmProvider';
import { toast } from '../lib/toast';

type AssetDetailTab = 'overview' | 'assignments' | 'activity';

function assetStatusTone(status: Asset['status']) {
  if (status === 'Inventory') return 'success' as const;
  if (status === 'Assigned') return 'info' as const;
  if (status === 'Repaired') return 'warning' as const;
  if (status === 'Retired' || status === 'Stolen') return 'danger' as const;
  return 'neutral' as const;
}

export default function AssetDetails({
  asset,
  onClose,
  nestedOverlay = false,
}: {
  asset: Asset;
  onClose: () => void;
  nestedOverlay?: boolean;
}) {
  const confirm = useConfirm();
  const [resolvedAsset, setResolvedAsset] = useState<Asset>(asset);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [detailTab, setDetailTab] = useState<AssetDetailTab>('overview');

  useEffect(() => {
    setResolvedAsset(asset);
    setDetailTab('overview');
  }, [asset]);

  useEffect(() => {
    const sync = () => {
      const s = getState();
      const fresh = s.assets.find((a) => a.id === asset.id);
      if (fresh) setResolvedAsset(fresh);
      setEmployees(s.employees);
      setHistory(
        s.history.filter((h) => h.assetId === asset.id).sort(sortHistoryNewestFirst)
      );
      setAssignments(
        s.assignments
          .filter((a) => a.assetId === asset.id)
          .sort((a, b) => b.assignedAt.toMillis() - a.assignedAt.toMillis())
      );
      setLoading(false);
    };
    sync();
    return subscribe(sync);
  }, [asset.id]);

  const getEmployeeName = (id: string) => employees.find((e) => e.id === id)?.name || 'Unknown';

  const handleDeleteAssignment = async (asgn: Assignment) => {
    const assigneeName = getEmployeeName(asgn.employeeId);
    const ok = await confirm({
      title: 'Delete assignment?',
      description: `Remove the assignment for ${assigneeName}. The asset checkout state will update from any remaining rows.`,
      confirmLabel: 'Delete assignment',
      variant: 'danger',
    });
    if (!ok) return;
    const removed = deleteAssignment(asgn.id);
    if (removed) {
      insertHistory({
        assetId: resolvedAsset.id,
        type: 'assignment',
        event: 'Assignment deleted',
        details: `Assignment removed (${assigneeName}; assigned ${format(removed.assignedAt.toDate(), 'MMM d, yyyy')}${removed.returnedAt ? `; returned ${format(removed.returnedAt.toDate(), 'MMM d, yyyy')}` : '; was open'}).`,
        userId: removed.employeeId,
        employeeId: removed.employeeId,
        timestamp: Timestamp.now(),
      });
      toast('Assignment deleted.');
    }
    setEditingAssignment((cur) => (cur?.id === asgn.id ? null : cur));
  };

  const currentTransferAt = useMemo(() => {
    if (!resolvedAsset.assignedTo) return null;
    const open = assignments.filter(
      (a) => a.employeeId === resolvedAsset.assignedTo && !a.returnedAt
    );
    if (open.length > 0) {
      return open.reduce((latest, a) =>
        a.assignedAt.toMillis() > latest.assignedAt.toMillis() ? a : latest
      ).assignedAt;
    }
    const fromHistory = history.find(
      (h) =>
        (h.type === 'assignment' &&
          ['Assigned', 'Assigned (swap)', 'Asset Assigned', 'Asset Swapped'].includes(h.event || '')) &&
        (h.userId === resolvedAsset.assignedTo || h.employeeId === resolvedAsset.assignedTo)
    );
    return fromHistory?.timestamp ?? null;
  }, [assignments, history, resolvedAsset.assignedTo]);

  const openAssignments = assignments.filter((a) => !a.returnedAt).length;

  const tabs: TabItem<AssetDetailTab>[] = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutGrid },
    { id: 'assignments' as const, label: 'Assignments', icon: Calendar, count: assignments.length },
    { id: 'activity' as const, label: 'Activity', icon: History, count: history.length },
  ];

  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4',
        nestedOverlay ? 'z-60' : 'z-50'
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0">
              <Tag className={iconSize.hero} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900 truncate">
                  {resolvedAsset.name || 'Untitled asset'}
                </h2>
                <StatusBadge label={resolvedAsset.status} tone={assetStatusTone(resolvedAsset.status)} />
              </div>
              <p className="text-sm text-gray-500 font-mono truncate">
                {resolvedAsset.serialNumber} • {resolvedAsset.deviceId}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors shrink-0">
            <X className={iconSize.hero} />
          </button>
        </div>

        <div className="px-8 pt-5 pb-0 border-b border-gray-100 bg-white">
          <TabBar<AssetDetailTab> tabs={tabs} active={detailTab} onChange={setDetailTab} />
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading asset details…</p>
          ) : detailTab === 'overview' ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <DetailCard title="Device specifications" icon={Info}>
                <DetailRow label="Model" value={resolvedAsset.model || '—'} />
                <DetailRow label="Type" value={<span className="capitalize">{resolvedAsset.type}</span>} />
                <DetailRow label="Location" value={resolvedAsset.location || '—'} />
                {resolvedAsset.chip && <DetailRow label="Chip / CPU" value={resolvedAsset.chip} />}
                {resolvedAsset.ram && <DetailRow label="RAM" value={resolvedAsset.ram} />}
                {resolvedAsset.storage && <DetailRow label="Storage" value={resolvedAsset.storage} />}
                <DetailRow
                  label="Purchase date"
                  value={
                    resolvedAsset.purchaseDate
                      ? format(resolvedAsset.purchaseDate.toDate(), 'MMM dd, yyyy')
                      : '—'
                  }
                />
              </DetailCard>

              <DetailCard title="Warranty & compliance" icon={Shield}>
                <DetailRow
                  label="Warranty status"
                  value={
                    <span
                      className={cn(
                        'font-semibold',
                        resolvedAsset.warrantyStatus === 'Active' ? 'text-emerald-600' : 'text-rose-600'
                      )}
                    >
                      {resolvedAsset.warrantyStatus}
                    </span>
                  }
                />
                <DetailRow
                  label="Warranty expiry"
                  value={
                    resolvedAsset.warrantyExpiry
                      ? format(resolvedAsset.warrantyExpiry.toDate(), 'MMM dd, yyyy')
                      : 'N/A'
                  }
                />
                <DetailRow
                  label="Last updated"
                  value={format(resolvedAsset.updatedAt.toDate(), 'MMM dd, yyyy HH:mm')}
                />
                <DetailRow
                  label="Created"
                  value={format(resolvedAsset.createdAt.toDate(), 'MMM dd, yyyy')}
                />
              </DetailCard>

              <DetailCard title="Current assignment" icon={User} className="lg:col-span-2">
                {resolvedAsset.assignedTo ? (
                  <>
                    <DetailRow label="Assignee" value={getEmployeeName(resolvedAsset.assignedTo)} />
                    <DetailRow label="Open check-outs" value={String(openAssignments)} />
                    {currentTransferAt && (
                      <DetailRow
                        label="Transferred on"
                        value={format(currentTransferAt.toDate(), 'MMM dd, yyyy')}
                      />
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">Not currently assigned — in inventory.</p>
                )}
              </DetailCard>

              {resolvedAsset.notes?.trim() && (
                <DetailCard title="Notes" icon={StickyNote} className="lg:col-span-2">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {resolvedAsset.notes.trim()}
                  </p>
                </DetailCard>
              )}
            </div>
          ) : detailTab === 'assignments' ? (
            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                  Full check-out history for this device. Open rows have no return date.
                </p>
                <span className="text-xs font-semibold text-gray-400">{assignments.length} total</span>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Assigned</th>
                      <th className="px-4 py-3">Returned / Due</th>
                      <th className="px-4 py-3">Condition</th>
                      <th className="px-4 py-3 max-w-[200px]">Notes</th>
                      <th className="px-4 py-3 w-28 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {assignments.map((asgn) => (
                      <tr key={asgn.id} className={!asgn.returnedAt ? 'bg-indigo-50/40' : undefined}>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {getEmployeeName(asgn.employeeId)}
                          {!asgn.returnedAt && (
                            <span className="ml-2 text-[10px] font-bold uppercase text-indigo-600">Open</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {format(asgn.assignedAt.toDate(), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {asgn.returnedAt
                            ? format(asgn.returnedAt.toDate(), 'MMM dd, yyyy')
                            : asgn.returnDate
                              ? `Due ${format(asgn.returnDate.toDate(), 'MMM dd, yyyy')}`
                              : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px]">
                            {asgn.condition ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[220px]">
                          {asgn.notes?.trim() ? (
                            <span className="text-xs leading-snug line-clamp-3" title={asgn.notes.trim()}>
                              {asgn.notes.trim()}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingAssignment(asgn)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit assignment"
                            >
                              <Pencil className={iconSize.sm} />
                            </button>
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
                          No assignments recorded for this asset.
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
                Lifecycle events and audit trail for this asset.
              </div>
              <div className="space-y-4">
                {history.length === 0 ? (
                  <p className="text-gray-400 text-sm italic py-8 text-center">No activity recorded yet.</p>
                ) : (
                  history.map((event) => {
                    const relatedUserId = event.userId ?? event.employeeId;
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
                          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-400">
                            {relatedUserId && <span>User: {getEmployeeName(relatedUserId)}</span>}
                            {event.performedBy && <span>By: {event.performedBy}</span>}
                          </div>
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

      {editingAssignment && (
        <AssignmentEditForm
          assignment={editingAssignment}
          asset={resolvedAsset}
          onClose={() => setEditingAssignment(null)}
        />
      )}
    </div>
  );
}
