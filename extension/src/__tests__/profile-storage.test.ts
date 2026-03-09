import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { profileStorage, wizardStateStorage } from '../storage/profile-storage';
import type { PreferenceProfile } from '../schema/profile';

describe('profileStorage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns null when no profile is saved', async () => {
    const profile = await profileStorage.getValue();
    expect(profile).toBeNull();
  });

  it('saves and retrieves the same profile', async () => {
    const testProfile: PreferenceProfile = {
      schemaVersion: 1,
      listingType: 'rent',
      location: 'Zurich',
      radiusKm: 10,
      propertyCategory: 'Apartment',
      priceMin: 1000,
      priceMax: 3000,
      onlyWithPrice: true,
      roomsMin: 2,
      roomsMax: 4,
      softCriteria: [],
      weights: { price: 0.6, location: 0.4 },
      weightInputs: { price: 60, location: 40 },
      free_text_search: '',
      createdAt: '2026-03-07T00:00:00Z',
      updatedAt: '2026-03-07T00:00:00Z',
    };

    await profileStorage.setValue(testProfile);
    const retrieved = await profileStorage.getValue();
    expect(retrieved).toEqual(testProfile);
  });
});

describe('wizardStateStorage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('has correct fallback values', async () => {
    const state = await wizardStateStorage.getValue();
    expect(state).toEqual({
      currentStep: 0,
      completedSteps: [],
      partialData: {},
    });
  });
});
