'use client'

import { useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { buildFlatfoxUrl, buildFlatfoxUrlWithGeocode, type FlatfoxUrlPreferences } from '@/lib/flatfox-url'

interface OpenInFlatfoxButtonProps {
  preferences: FlatfoxUrlPreferences
  className?: string
  variant?: 'card' | 'link'
}

export function OpenInFlatfoxButton({ preferences, className, variant = 'card' }: OpenInFlatfoxButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const url = await buildFlatfoxUrlWithGeocode(preferences)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      // Fallback to non-geocoded URL
      const url = buildFlatfoxUrl(preferences)
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'link') {
    return (
      <button
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
      onClick={handleClick}
      disabled={loading}
      className={className ?? "inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50 cursor-pointer"}
    >
      {loading ? <Loader2 className="size-3 animate-spin" /> : <ExternalLink className="size-3" />}
      {loading ? 'Opening...' : 'Open in Flatfox'}
    </button>
  )
}
