'use client'

import { useRef, useEffect } from 'react'
import type { UIMessage } from 'ai'

interface ChatMessagesProps {
  messages: UIMessage[]
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-muted-foreground text-sm">
        Start chatting to discover your preferences
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((message) => {
        const isUser = message.role === 'user'
        const textParts = message.parts?.filter(
          (part): part is { type: 'text'; text: string } => part.type === 'text'
        )
        const text = textParts?.map((p) => p.text).join('') ?? ''

        if (!text) return null

        return (
          <div
            key={message.id}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`px-3 py-2 rounded-lg max-w-[80%] text-sm whitespace-pre-wrap ${
                isUser
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {text}
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
