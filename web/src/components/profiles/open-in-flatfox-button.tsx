'use client'

import { useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { buildFlatfoxUrl, buildFlatfoxUrlWithGeocode, type FlatfoxUrlPreferences } from '@/lib/flatfox-url'
import type { Language } from '@/lib/translations'

interface OpenInFlatfoxButtonProps {
  preferences: FlatfoxUrlPreferences
  className?: string
  variant?: 'card' | 'link'
  /** HTML id attribute — used as onboarding tour target */
  id?: string
  /** UI language — used to build locale-specific Flatfox URL */
  language?: Language
  /**
   * Optional async callback invoked before the Flatfox tab opens.
   * Used by onboarding to write step=5 to Supabase before the user leaves the page.
   */
  onBeforeOpen?: () => Promise<void>
  /**
   * Optional extra query parameters appended to the final Flatfox URL.
   * Used by onboarding to pass `homematch_onboarding=5` so the extension
   * content script can bootstrap the overlay even before the user is logged in.
   */
  appendParams?: Record<string, string>
}

export function OpenInFlatfoxButton({ preferences, className, variant = 'card', id, language, onBeforeOpen, appendParams }: OpenInFlatfoxButtonProps) {
  const [loading, setLoading] = useState(false)

  function applyAppendParams(url: string): string {
    if (!appendParams || Object.keys(appendParams).length === 0) return url
    const parsed = new URL(url)
    for (const [key, value] of Object.entries(appendParams)) {
      parsed.searchParams.set(key, value)
    }
    return parsed.toString()
  }

  async function handleClick() {
    setLoading(true)
    try {
      // Run pre-open callback (e.g. persist onboarding state) before opening the tab
      if (onBeforeOpen) {
        await onBeforeOpen()
      }
      const url = applyAppendParams(await buildFlatfoxUrlWithGeocode(preferences, language))
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      // Fallback to non-geocoded URL
      const url = applyAppendParams(buildFlatfoxUrl(preferences, language))
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'link') {
    return (
      <button
        id={id}
        onClick={handleClick}
        disabled={loading}
        className={className ?? "inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline shrink-0 disabled:opacity-50 cursor-pointer"}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
        {loading ? 'Opening...' : 'Open in Flatfox'}
      </button>
    )
  }

  return (
    <button
      id={id}
      onClick={handleClick}
      disabled={loading}
      className={className ?? "inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"}
    >
      {loading ? <Loader2 className="size-3 animate-spin" /> : <ExternalLink className="size-3" />}
      {loading ? 'Opening...' : 'Open in Flatfox'}
    </button>
  )
}
