'use client'

import { useState, useEffect, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { MessageSquare, X, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import { ExtractedFieldsReview } from './extracted-fields-review'
import { saveMessages, loadMessages } from '@/lib/chat/persistence'
import { extractPreferencesFromChat } from '@/app/(dashboard)/profiles/actions'
import type { DynamicField } from '@/lib/schemas/preferences'

interface ChatPanelProps {
  profileId: string
  onFieldsExtracted: (fields: DynamicField[]) => void
}

export function ChatPanel({ profileId, onFieldsExtracted }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [extractedFields, setExtractedFields] = useState<DynamicField[] | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)

  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Count assistant messages with text content
  const assistantMessageCount = messages.filter(
    (m) =>
      m.role === 'assistant' &&
      m.parts?.some((p) => p.type === 'text' && (p as { type: 'text'; text: string }).text.trim())
  ).length

  const canExtract = assistantMessageCount >= 2

  // Restore messages from sessionStorage on mount / profileId change
  useEffect(() => {
    const stored = loadMessages(profileId)
    if (stored.length > 0) {
      setMessages(stored)
    }
  }, [profileId, setMessages])

  // Persist messages to sessionStorage when they change
  useEffect(() => {
    saveMessages(profileId, messages)
  }, [profileId, messages])

  const handleSend = useCallback(
    (text: string) => {
      if (isLoading) return
      sendMessage({ text })
    },
    [isLoading, sendMessage]
  )

  const handleExtract = useCallback(async () => {
    setIsExtracting(true)
    setExtractionError(null)
    try {
      const conversationText = messages
        .map((m) => {
          const textParts = m.parts?.filter(
            (p): p is { type: 'text'; text: string } => p.type === 'text'
          )
          const text = textParts?.map((p) => p.text).join('') ?? ''
          return `${m.role}: ${text}`
        })
        .join('\n')

      const fields = await extractPreferencesFromChat(conversationText)
      setExtractedFields(fields)
    } catch (err) {
      setExtractionError(
        err instanceof Error ? err.message : 'Failed to extract preferences'
      )
    } finally {
      setIsExtracting(false)
    }
  }, [messages])

  const handleAcceptFields = useCallback(
    (fields: DynamicField[]) => {
      onFieldsExtracted(fields)
      setExtractedFields(null)
    },
    [onFieldsExtracted]
  )

  const handleCancelReview = useCallback(() => {
    setExtractedFields(null)
  }, [])

  if (!isOpen) {
    return (
      <div className="mb-4">
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="gap-2"
        >
          <MessageSquare className="size-4" />
          Chat with AI
        </Button>
      </div>
    )
  }

  return (
    <div className="mb-4 border rounded-lg shadow-lg bg-background flex flex-col h-[400px] md:h-[500px]">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold text-sm">Preference Discovery Chat</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          aria-label="Close chat"
        >
          <X className="size-4" />
        </Button>
      </div>

      {extractedFields !== null ? (
        <div className="flex-1 overflow-y-auto p-4">
          <ExtractedFieldsReview
            fields={extractedFields}
            onAccept={handleAcceptFields}
            onCancel={handleCancelReview}
          />
        </div>
      ) : (
        <>
          <ChatMessages messages={messages} />
          <div className="border-t px-3 py-2 flex items-center gap-2">
            {canExtract && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleExtract}
                disabled={isExtracting || isLoading}
                className="gap-1.5 shrink-0"
              >
                {isExtracting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                {isExtracting ? 'Extracting...' : 'Extract Preferences'}
              </Button>
            )}
            {extractionError && (
              <p className="text-xs text-destructive truncate">{extractionError}</p>
            )}
          </div>
          <ChatInput
            onSend={handleSend}
            disabled={isLoading}
          />
        </>
      )}
    </div>
  )
}
