/**
 * Lets Electron drain IPC, overlay paints, and input before the next chunk of
 * main-process work. The main process is one JS thread — a tight sync loop
 * (history fold, summary decode, cache sweep) freezes the dashboard.
 */
export function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}
