// Lightweight debug helpers, enabled via localStorage.DEBUG_MEAL = '1'

export function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('DEBUG_MEAL') === '1';
  } catch {
    return false;
  }
}

export function log(...args: any[]): void {
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

export function warn(...args: any[]): void {
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}

export function group(label: string, fn: () => void): void {
  if (!isDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.group(label);
  try { fn(); } finally {
    // eslint-disable-next-line no-console
    console.groupEnd();
  }
}


