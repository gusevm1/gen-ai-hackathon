'use client';

import { CheckCircle2, Circle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOnboardingContext } from '@/components/onboarding/OnboardingProvider';
import { useLanguage } from '@/lib/language-context';
import { t, type TranslationKey } from '@/lib/translations';

/**
 * Checklist items for the 9-step onboarding tour.
 * Each item has a label and the minimum step at which it is considered complete.
 *
 * Steps:
 *   1 — Welcome intro
 *   2 — Install extension
 *   3 — Create profile
 *   4 — Open Flatfox
 *   5 — Log in to extension
 *   6 — Analyze listings
 *   7 — View your results
 *   8 — View full analysis
 *   9 — Explore the web app (post-analysis tooltips)
 */
const CHECKLIST_ITEMS: Array<{ labelKey: TranslationKey; completedFromStep: number }> = [
  { labelKey: 'onboarding_checklist_welcome',   completedFromStep: 2 },
  { labelKey: 'onboarding_checklist_install',   completedFromStep: 3 },
  { labelKey: 'onboarding_checklist_profile',   completedFromStep: 4 },
  { labelKey: 'onboarding_checklist_flatfox',   completedFromStep: 5 },
  { labelKey: 'onboarding_checklist_login_ext', completedFromStep: 6 },
  { labelKey: 'onboarding_checklist_analyze',   completedFromStep: 7 },
  { labelKey: 'onboarding_checklist_results',   completedFromStep: 8 },
  { labelKey: 'onboarding_checklist_full_analysis', completedFromStep: 9 },
];

export function OnboardingChecklist() {
  const { state, isActive, skip } = useOnboardingContext();
  const { language } = useLanguage();

  if (!isActive || !state) return null;

  const step = state.onboarding_step;
  const totalItems = CHECKLIST_ITEMS.length;
  // Current item index (0-based) — the first unchecked item
  const completedCount = CHECKLIST_ITEMS.filter((item) => step >= item.completedFromStep).length;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-64">
      <Card className="shadow-lg border">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Getting Started
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="size-5 text-muted-foreground hover:text-foreground"
              onClick={skip}
              aria-label={t(language, 'onboarding_skip')}
            >
              <X className="size-3" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {completedCount} of {totalItems} complete
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <ul className="space-y-2">
            {CHECKLIST_ITEMS.map(({ labelKey, completedFromStep }) => {
              const checked = step >= completedFromStep;
              return (
                <li key={labelKey} className="flex items-center gap-2 text-sm">
                  {checked ? (
                    <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={checked ? 'line-through text-muted-foreground' : ''}>
                    {t(language, labelKey)}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
