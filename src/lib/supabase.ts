import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

/**
 * In-memory mutex used as the auth lock.
 * The default Navigator LockManager can deadlock across tabs; this keeps a
 * simple queue with a hard timeout cap so the UI never hangs forever.
 */
let lockChain: Promise<void> = Promise.resolve();

const safeLock = async (
  _name: string,
  acquireTimeout: number,
  fn: () => Promise<unknown>
): Promise<unknown> => {
  const timeoutMs = Math.min(acquireTimeout ?? 10000, 10000);
  const previous = lockChain;
  let release: () => void = () => {};
  lockChain = new Promise<void>((resolve) => {
    release = resolve;
  });

  await Promise.race([
    previous,
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);

  try {
    return await fn();
  } finally {
    release();
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: safeLock as never,
  },
});