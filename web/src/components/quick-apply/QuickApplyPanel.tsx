'use client'

import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QuickApplyPanelProps {
  listingId: string
  listingAddress: string
  listingType: string
  profileName: string
  keyPreferences: string[]
  moveInIntent: string
  userName: string
  userEmail: string
  userPhone: string
  onApplied: () => void
  onDismiss: () => void
  supabaseUrl: string
  supabaseAnonKey: string
  authToken: string
}

export function QuickApplyPanel({
  listingId, listingAddress, listingType,
  profileName, keyPreferences, moveInIntent,
  userName, userEmail, userPhone,
  onApplied, onDismiss,
  supabaseUrl, supabaseAnonKey, authToken,
}: QuickApplyPanelProps) {
  const [draft, setDraft] = useState('')
  const [loadingDraft, setLoadingDraft] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const edgeFnUrl = (name: string) => `${supabaseUrl}/functions/v1/${name}`
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}`, apikey: supabaseAnonKey }

  const fetchDraft = async () => {
    setLoadingDraft(true)
    setError(null)
    try {
      const res = await fetch(edgeFnUrl('generate-message'), {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ listing_id: listingId, listing_address: listingAddress, listing_type: listingType, profile_name: profileName, key_preferences: keyPreferences, move_in_intent: moveInIntent }),
      })
      const data = await res.json()
      setDraft(data.message ?? '')
    } catch {
      setDraft('')
      setError('Could not generate draft. You can type your message manually.')
    } finally {
      setLoadingDraft(false)
    }
  }

  useEffect(() => { fetchDraft() }, [])

  const handleSend = async () => {
    setSending(true)
    setError(null)
    try {
      const res = await fetch(edgeFnUrl('quick-apply'), {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ listing_id: listingId, name: userName, email: userEmail, phone: userPhone, message: draft }),
      })
      const data = await res.json()
      if (data.success) {
        onApplied()
      } else {
        setError(data.error ?? 'Send failed. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Quick Apply</span>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {loadingDraft ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating draft...
        </div>
      ) : (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Your message..."
        />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={fetchDraft}
          disabled={loadingDraft}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className="h-3 w-3" />
          Regenerate
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDismiss} disabled={sending}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSend} disabled={sending || loadingDraft || !draft}>
            {sending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Sending...</> : <><Send className="mr-1.5 h-3.5 w-3.5" />Send</>}
          </Button>
        </div>
      </div>
    </div>
  )
}
