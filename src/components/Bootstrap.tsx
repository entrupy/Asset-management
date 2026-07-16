import React, { useEffect, useState } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '../config';
import { initializeStore } from '../data/localStore';
import { iconSize } from '../lib/icons';

export default function Bootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void initializeStore()
      .then(() => {
        if (cancelled) return;
        setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not start the application.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <div className="max-w-md rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-xl">
          <p className="text-lg font-bold text-gray-900">Unable to load {APP_NAME}</p>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-6">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
          <Package className={iconSize.hero} />
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Loader2 className={`${iconSize.md} animate-spin`} aria-hidden />
          <span className="text-sm font-semibold">Loading {APP_NAME}…</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">{APP_TAGLINE}</p>
      </div>
    );
  }

  return <>{children}</>;
}
