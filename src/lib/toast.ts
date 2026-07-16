export type ToastType = 'success' | 'error' | 'info';

export type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

const listeners = new Set<() => void>();
let toasts: ToastItem[] = [];

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function subscribeToasts(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getToasts(): readonly ToastItem[] {
  return toasts;
}

export function toast(message: string, type: ToastType = 'success'): void {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  toasts = [...toasts, { id, message, type }];
  notify();
  window.setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 4200);
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}
