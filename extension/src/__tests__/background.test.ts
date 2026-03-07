import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

// Import the background script to register its listeners
import '../entrypoints/background';

describe('background onInstalled', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('opens onboarding tab on first install', async () => {
    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'install' });
    expect(fakeBrowser.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('onboarding.html'),
      }),
    );
  });

  it('does NOT open onboarding tab on update', async () => {
    await fakeBrowser.runtime.onInstalled.trigger({ reason: 'update' });
    expect(fakeBrowser.tabs.create).not.toHaveBeenCalled();
  });

  it('does NOT open onboarding tab on chrome_update', async () => {
    await fakeBrowser.runtime.onInstalled.trigger({
      reason: 'chrome_update',
    });
    expect(fakeBrowser.tabs.create).not.toHaveBeenCalled();
  });
});
