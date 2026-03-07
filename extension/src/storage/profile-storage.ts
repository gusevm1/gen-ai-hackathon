import { storage } from 'wxt/utils/storage';
import type { PreferenceProfile, StepFiltersData, SoftCriterion } from '../schema/profile';

export interface WizardPartialData {
  filters?: StepFiltersData;
  softCriteria?: SoftCriterion[];
  weights?: Record<string, number>;
}

export interface WizardState {
  currentStep: number;
  completedSteps: number[];
  partialData: WizardPartialData;
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
