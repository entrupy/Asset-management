import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { dismissToast, getToasts, subscribeToasts, type ToastItem } from '../../lib/toast';
import { iconSize } from '../../lib/icons';
import { cn } from '../../lib/utils';

function ToastCard({ item }: { item: ToastItem }) {
  const Icon =
    item.type === 'success' ? CheckCircle2 : item.type === 'error' ? AlertCircle : Info;
  const tone =
    item.type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : item.type === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-900'
        : 'border-sky-200 bg-sky-50 text-sky-900';

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg shadow-gray-900/10',
        tone
      )}
    >
      <Icon className={cn(iconSize.md, 'shrink-0 mt-0.5')} aria-hidden />
      <p className="flex-1 text-sm font-medium leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={() => dismissToast(item.id)}
        className="shrink-0 rounded-lg p-1 opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className={iconSize.sm} />
      </button>
    </div>
  );
}

export default function ToastHost() {
  const [items, setItems] = useState(getToasts());

  useEffect(() => subscribeToasts(() => setItems([...getToasts()])), []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      aria-live="polite"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
