'use client';

import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboardingContext } from '@/components/onboarding/OnboardingProvider';
import { useLanguage } from '@/lib/language-context';
import { t } from '@/lib/translations';

interface TakeATourButtonProps {
  variant?: 'dropdown' | 'inline';
}

export function TakeATourButton({ variant = 'inline' }: TakeATourButtonProps) {
  const { startTour } = useOnboardingContext();
  const { language } = useLanguage();

  if (variant === 'dropdown') {
    return (
      <span className="flex items-center">
        <Compass className="mr-2 size-4" />
        {t(language, 'onboarding_take_tour')}
      </span>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={startTour} className="gap-2">
      <Compass className="size-4" />
      {t(language, 'onboarding_take_tour')}
    </Button>
  );
}
