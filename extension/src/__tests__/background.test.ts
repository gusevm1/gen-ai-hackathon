import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { handleInstalled, handleMessage } from '../entrypoints/background';

// Mock supabase module for profile and health message tests
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

describe('background onInstalled', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
    vi.spyOn(fakeBrowser.tabs, 'create');
    vi.spyOn(fakeBrowser.runtime, 'getURL').mockImplementation(
      (path: string) => `chrome-extension://test-id${path}`,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens onboarding tab on first install', async () => {
    await handleInstalled({ reason: 'install' });
    expect(fakeBrowser.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('onboarding.html'),
      }),
    );
  });

  it('does NOT open onboarding tab on update', async () => {
    await handleInstalled({ reason: 'update' });
    expect(fakeBrowser.tabs.create).not.toHaveBeenCalled();
  });

  it('does NOT open onboarding tab on chrome_update', async () => {
    await handleInstalled({ reason: 'chrome_update' });
    expect(fakeBrowser.tabs.create).not.toHaveBeenCalled();
  });
});

describe('background profile and health messages', () => {
  let supabase: any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const mod = await import('@/lib/supabase');
    supabase = mod.supabase;
  });

  it('handleMessage getProfiles queries profiles table', async () => {
    const mockProfiles = [
      { id: '1', name: 'Default', is_default: true },
      { id: '2', name: 'Partner', is_default: false },
    ];
    const mockOrder = vi.fn().mockResolvedValue({ data: mockProfiles, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    supabase.from = vi.fn().mockReturnValue({ select: mockSelect });

    const result = await handleMessage({ action: 'getProfiles' }) as any;

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(mockSelect).toHaveBeenCalledWith('id, name, is_default');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(result.profiles).toEqual(mockProfiles);
    expect(result.error).toBeNull();
  });

  it('handleMessage switchProfile calls set_active_profile RPC', async () => {
    supabase.rpc = vi.fn().mockResolvedValue({ error: null });

    const result = await handleMessage({
      action: 'switchProfile',
      profileId: 'test-id',
    }) as any;

    expect(supabase.rpc).toHaveBeenCalledWith('set_active_profile', {
      target_profile_id: 'test-id',
    });
    expect(result.error).toBeNull();
  });

  it('handleMessage healthCheck returns connected true when user exists', async () => {
    supabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { email: 'a@b.c' } },
      error: null,
    });

    const result = await handleMessage({ action: 'healthCheck' }) as any;

    expect(result.connected).toBe(true);
    expect(result.email).toBe('a@b.c');
  });

  it('handleMessage healthCheck returns connected false on error', async () => {
    supabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'expired' },
    });

    const result = await handleMessage({ action: 'healthCheck' }) as any;

    expect(result.connected).toBe(false);
    expect(result.email).toBeNull();
  });
});
