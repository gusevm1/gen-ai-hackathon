import { useState } from 'react';
import { useWizardState } from '@/hooks/useWizardState';
import { useProfile } from '@/hooks/useProfile';
import { toggleTheme, themeStorage } from '@/lib/theme';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StepFilters } from './StepFilters';
import { StepSoftCriteria } from './StepSoftCriteria';
import { StepWeights } from './StepWeights';
import { CheckCircle, Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';

import type { StepFiltersData, SoftCriterion, PreferenceProfile } from '@/schema/profile';

// -- Step labels for progress bar --

const STEP_LABELS = ['Filters', 'Soft Criteria', 'Weights'] as const;

// -- Category derivation logic (per plan) --

function deriveCategories(
  filters?: StepFiltersData,
  softCriteria?: SoftCriterion[],
): string[] {
  const cats: string[] = [];

  if (filters) {
    if (filters.location || filters.radiusKm) cats.push('Location');
    if (filters.priceMin || filters.priceMax) cats.push('Budget');
    if (
      filters.roomsMin ||
      filters.roomsMax ||
      filters.livingSpaceMin ||
      filters.livingSpaceMax
    )
      cats.push('Size & Rooms');
    if (filters.propertyTypes?.length) cats.push('Property Type');
    if (
      filters.yearBuiltMin ||
      filters.yearBuiltMax ||
      filters.floorPreference
    )
      cats.push('Building');
    if (filters.features?.length) cats.push('Features');
    if (filters.availability) cats.push('Availability');
  }

  // Add unique soft criteria categories
  if (softCriteria?.length) {
    const softCats = [...new Set(softCriteria.map((c) => c.category))];
    softCats.forEach((cat) => {
      if (!cats.includes(cat)) cats.push(cat);
    });
  }

  // Ensure at least 2 categories for meaningful weighting
  if (cats.length < 2) cats.push('General');
  if (cats.length < 2) cats.push('Overall');

  return cats;
}

// -- Props --

interface WizardShellProps {
  isEditMode?: boolean;
}

// -- Component --

export function WizardShell({ isEditMode = false }: WizardShellProps) {
  const wizard = useWizardState();
  const { saveProfile, profile } = useProfile();
  const [isDark, setIsDark] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Initialize dark mode state
  useEffect(() => {
    themeStorage.getValue().then((theme) => {
      setIsDark(theme === 'dark');
    });
  }, []);

  const handleThemeToggle = async () => {
    await toggleTheme();
    setIsDark((prev) => !prev);
  };

  // -- Step handlers --

  const handleFiltersComplete = async (data: StepFiltersData) => {
    await wizard.saveStepData(0, data);
    await wizard.goNext();
  };

  const handleSoftCriteriaComplete = async (criteria: SoftCriterion[]) => {
    await wizard.saveStepData(1, criteria);
    await wizard.goNext();
  };

  const handleWeightsComplete = async (weights: Record<string, number>) => {
    await wizard.saveStepData(2, weights);

    // Assemble full profile
    const now = new Date().toISOString();
    const fullProfile: PreferenceProfile = {
      schemaVersion: 1,
      // Step 1 data
      ...wizard.partialData.filters,
      // Step 2 data
      softCriteria: wizard.partialData.softCriteria ?? [],
      // Step 3 data
      weights,
      // Metadata
      createdAt: isEditMode && profile?.createdAt ? profile.createdAt : now,
      updatedAt: now,
    };

    await saveProfile(fullProfile);
    await wizard.clearWizardState();
    setIsComplete(true);
  };

  // -- Loading state --

  if (wizard.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading your preferences...</p>
        </div>
      </div>
    );
  }

  // -- Success screen --

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4 rounded-2xl shadow-lg">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                Preferences Saved!
              </h2>
              <p className="text-muted-foreground">
                Your profile is ready. You can close this tab and start browsing
                Homegate -- HomeMatch will score listings for you.
              </p>
            </div>
            <div className="pt-2 space-y-3">
              <p className="text-xs text-muted-foreground">
                Click the HomeMatch icon in your toolbar to view your profile
                summary or toggle the extension on/off.
              </p>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => window.close()}
              >
                Close Tab
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -- Progress --

  const progressPercent = ((wizard.currentStep + 1) / wizard.totalSteps) * 100;

  // -- Derive categories for Step 3 --

  const categories = deriveCategories(
    wizard.partialData.filters,
    wizard.partialData.softCriteria,
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isEditMode || wizard.isEditMode
                ? 'Edit Your Preferences'
                : 'Welcome to HomeMatch'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isEditMode || wizard.isEditMode
                ? 'Update your property search criteria'
                : 'Set up your property preferences to get personalized match scores'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-muted-foreground" />
            <Switch
              checked={isDark}
              onCheckedChange={handleThemeToggle}
              aria-label="Toggle dark mode"
            />
            <Moon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Step {wizard.currentStep + 1} of {wizard.totalSteps}
            </span>
            <span className="font-medium text-foreground">
              {STEP_LABELS[wizard.currentStep]}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between">
            {STEP_LABELS.map((label, i) => (
              <span
                key={label}
                className={`text-xs transition-colors ${
                  i <= wizard.currentStep
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          {wizard.currentStep === 0 && (
            <StepFilters
              defaultValues={wizard.partialData.filters}
              onComplete={handleFiltersComplete}
            />
          )}
          {wizard.currentStep === 1 && (
            <StepSoftCriteria
              defaultValues={wizard.partialData.softCriteria}
              onComplete={handleSoftCriteriaComplete}
              onBack={wizard.goBack}
            />
          )}
          {wizard.currentStep === 2 && (
            <StepWeights
              categories={categories}
              defaultWeights={wizard.partialData.weights}
              onComplete={handleWeightsComplete}
              onBack={wizard.goBack}
            />
          )}
        </div>
      </div>
    </div>
  );
}
