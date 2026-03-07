import { useState, useEffect, useCallback } from 'react';
import { wizardStateStorage, profileStorage } from '../storage/profile-storage';
import type { WizardPartialData } from '../storage/profile-storage';
import type { StepFiltersData, SoftCriterion } from '../schema/profile';

const TOTAL_STEPS = 3;

export interface UseWizardStateReturn {
  currentStep: number;
  totalSteps: number;
  isFirst: boolean;
  isLast: boolean;
  isLoading: boolean;
  isEditMode: boolean;
  partialData: WizardPartialData;
  goNext: () => Promise<void>;
  goBack: () => Promise<void>;
  saveStepData: (step: number, data: StepFiltersData | SoftCriterion[] | Record<string, number>) => Promise<void>;
  clearWizardState: () => Promise<void>;
}

export function useWizardState(): UseWizardStateReturn {
  const [currentStep, setCurrentStep] = useState(0);
  const [partialData, setPartialData] = useState<WizardPartialData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Check if a complete profile already exists (edit mode)
        const existingProfile = await profileStorage.getValue();
        if (existingProfile) {
          setIsEditMode(true);
        }

        // Restore wizard state
        const state = await wizardStateStorage.getValue();
        if (state) {
          setCurrentStep(state.currentStep);
          setPartialData(state.partialData);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const goNext = useCallback(async () => {
    const next = Math.min(currentStep + 1, TOTAL_STEPS - 1);
    setCurrentStep(next);
    const state = await wizardStateStorage.getValue();
    await wizardStateStorage.setValue({
      ...state,
      currentStep: next,
      completedSteps: [...new Set([...(state.completedSteps || []), currentStep])],
    });
  }, [currentStep]);

  const goBack = useCallback(async () => {
    const prev = Math.max(currentStep - 1, 0);
    setCurrentStep(prev);
    const state = await wizardStateStorage.getValue();
    await wizardStateStorage.setValue({ ...state, currentStep: prev });
  }, [currentStep]);

  const saveStepData = useCallback(
    async (step: number, data: StepFiltersData | SoftCriterion[] | Record<string, number>) => {
      const state = await wizardStateStorage.getValue();
      const updatedPartial = { ...state.partialData };

      if (step === 0) {
        updatedPartial.filters = data as StepFiltersData;
      } else if (step === 1) {
        updatedPartial.softCriteria = data as SoftCriterion[];
      } else if (step === 2) {
        updatedPartial.weights = data as Record<string, number>;
      }

      setPartialData(updatedPartial);
      await wizardStateStorage.setValue({
        ...state,
        partialData: updatedPartial,
      });
    },
    [],
  );

  const clearWizardState = useCallback(async () => {
    await wizardStateStorage.setValue({
      currentStep: 0,
      completedSteps: [],
      partialData: {},
    });
    setCurrentStep(0);
    setPartialData({});
  }, []);

  return {
    currentStep,
    totalSteps: TOTAL_STEPS,
    isFirst: currentStep === 0,
    isLast: currentStep === TOTAL_STEPS - 1,
    isLoading,
    isEditMode,
    partialData,
    goNext,
    goBack,
    saveStepData,
    clearWizardState,
  };
}
