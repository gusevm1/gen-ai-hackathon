import { storage } from 'wxt/utils/storage';
import type { PreferenceProfile } from '../schema/profile';

export interface WizardState {
  currentStep: number;
  completedSteps: number[];
  partialData: Record<string, unknown>;
}

export const profileStorage = storage.defineItem<PreferenceProfile | null>(
  'local:userProfile',
  {
    fallback: null,
    version: 1,
  },
);

export const wizardStateStorage = storage.defineItem<WizardState>(
  'local:wizardState',
  {
    fallback: {
      currentStep: 0,
      completedSteps: [],
      partialData: {},
    },
    version: 1,
  },
);
