'use client'

import Link from 'next/link'
import { Download } from 'lucide-react'
import { useOnboardingContext } from '@/components/onboarding/OnboardingProvider'

export function ExtensionInstallBanner() {
  const { state, isLoading } = useOnboardingContext()

  // Do not render while loading or if state is unavailable
  if (isLoading || !state) return null

  // Only show for users who:
  //   - have not confirmed extension install (step < 3)
  //   - have not completed onboarding
  //   - are not currently in an active tour (banner is redundant during tour)
  if (state.onboarding_step >= 3 || state.onboarding_completed || state.onboarding_active) {
    return null
  }

  return (
    <div className="w-full max-w-2xl mb-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        Get the most out of HomeMatch —{' '}
        <Link
          href="/download"
          className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        >
          Install the extension →
        </Link>
      </p>
      <Download className="size-4 text-primary shrink-0" />
    </div>
  )
}
