import React from 'react';
import { cn } from '../../lib/utils';
import { iconSize } from '../../lib/icons';
import type { LucideIcon } from 'lucide-react';

export type TabItem<T extends string> = {
  id: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
};

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: readonly TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-1 overflow-x-auto rounded-2xl border border-gray-100 bg-gray-50/80 p-1 custom-scrollbar',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all',
              selected
                ? 'bg-white text-indigo-700 shadow-sm shadow-gray-200/80'
                : 'text-gray-500 hover:bg-white/60 hover:text-gray-800'
            )}
          >
            {Icon && <Icon className={iconSize.sm} aria-hidden />}
            {tab.label}
            {tab.count != null && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                  selected ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-200/80 text-gray-600'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function DetailCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-gray-100 bg-gray-50/60 p-5', className)}>
      <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        {Icon && <Icon className={iconSize.xs} aria-hidden />}
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className="text-right font-semibold text-gray-900">{children ?? value ?? '—'}</span>
    </div>
  );
}

export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'success' | 'info' | 'warning' | 'danger' | 'neutral';
}) {
  const tones = {
    success: 'bg-emerald-100 text-emerald-800',
    info: 'bg-sky-100 text-sky-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-rose-100 text-rose-800',
    neutral: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase', tones[tone])}>
      {label}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 max-w-2xl text-sm text-gray-500">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
