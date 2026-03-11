/**
 * Supabase client for Chrome extension (Manifest V3).
 *
 * Uses a custom browser.storage.local adapter because MV3 background
 * service workers do not have access to localStorage.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mlhtozdtiorkemamzjjc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SP7baaxxxHimQk_4ESpB3g_Q8--KBPY';

/**
 * Storage adapter backed by browser.storage.local (WXT API).
 * Required for MV3 service workers where localStorage is unavailable.
 */
const chromeStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const result = await browser.storage.local.get(key);
    return (result[key] as string) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  },
  async removeItem(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
