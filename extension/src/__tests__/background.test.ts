import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { handleInstalled } from '../entrypoints/background';

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
