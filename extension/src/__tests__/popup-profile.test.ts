import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

/**
 * Wave 0 test scaffolds for popup profile messaging contract.
 * Validates that the popup sends correctly-shaped messages and
 * the background responds with the expected contract.
 *
 * Uses fakeBrowser with a mock onMessage listener to simulate
 * the background script responding to messages.
 * Note: fakeBrowser listeners return the response (no sendResponse callback).
 */

describe('popup profile messaging', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('getProfiles message returns profiles list', async () => {
    const expectedProfiles = [{ id: '1', name: 'Default', is_default: true }];

    // Register a mock background listener that returns a value
    fakeBrowser.runtime.onMessage.addListener((message: any) => {
      if (message.action === 'getProfiles') {
        return { profiles: expectedProfiles };
      }
    });

    const result: any = await fakeBrowser.runtime.sendMessage({ action: 'getProfiles' });

    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0]).toEqual({
      id: '1',
      name: 'Default',
      is_default: true,
    });
  });

  it('switchProfile message sends profileId', async () => {
    const receivedMessages: any[] = [];

    fakeBrowser.runtime.onMessage.addListener((message: any) => {
      receivedMessages.push(message);
      if (message.action === 'switchProfile') {
        return { error: null };
      }
    });

    const result: any = await fakeBrowser.runtime.sendMessage({
      action: 'switchProfile',
      profileId: 'test-id',
    });

    expect(receivedMessages[0]).toEqual({
      action: 'switchProfile',
      profileId: 'test-id',
    });
    expect(result.error).toBeNull();
  });

  it('healthCheck returns connected status', async () => {
    fakeBrowser.runtime.onMessage.addListener((message: any) => {
      if (message.action === 'healthCheck') {
        return { connected: true, email: 'test@example.com' };
      }
    });

    const result: any = await fakeBrowser.runtime.sendMessage({ action: 'healthCheck' });

    expect(result.connected).toBe(true);
    expect(result.email).toBe('test@example.com');
  });
});
