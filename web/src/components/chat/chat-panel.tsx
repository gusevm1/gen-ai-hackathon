'use client'

import { useState, useEffect, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { MessageSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import { saveMessages, loadMessages } from '@/lib/chat/persistence'
import type { DynamicField } from '@/lib/schemas/preferences'

interface ChatPanelProps {
  profileId: string
  onFieldsExtracted: (fields: DynamicField[]) => void
}

export function ChatPanel({ profileId, onFieldsExtracted }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')

  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

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

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value)
    },
    []
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const text = input.trim()
      if (!text || isLoading) return
      sendMessage({ text })
      setInput('')
    },
    [input, isLoading, sendMessage]
  )

  // Suppress lint warning for onFieldsExtracted -- wired in Plan 03
  void onFieldsExtracted

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
      <ChatMessages messages={messages} />
      <ChatInput
        input={input}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
