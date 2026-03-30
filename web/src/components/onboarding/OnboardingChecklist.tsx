'use client';

import { CheckCircle2, Circle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOnboardingContext } from '@/components/onboarding/OnboardingProvider';
import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';

export function OnboardingChecklist() {
  const { state, isActive, skip } = useOnboardingContext();
  const { language } = useLanguage();

  if (!isActive || !state) return null;

  const step = state.onboarding_step;

  const items = [
    {
      label: t(language, 'onboarding_checklist_install'),
      checked: step > 1,
    },
    {
      label: t(language, 'onboarding_checklist_profile'),
      checked: step > 2,
    },
    {
      label: t(language, 'onboarding_checklist_analyze'),
      checked: step > 7,
    },
  ];

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
            Step {Math.min(step, 8)} of 8
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <ul className="space-y-2">
            {items.map(({ label, checked }) => (
              <li key={label} className="flex items-center gap-2 text-sm">
                {checked ? (
                  <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className={checked ? 'line-through text-muted-foreground' : ''}>
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
