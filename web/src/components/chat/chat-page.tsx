"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ChatInput } from "./chat-input"
import { ProfileNamePrompt } from "./profile-name-prompt"
import { AIAvatar } from "./ai-avatar"
import { TypingIndicator } from "./typing-indicator"

type ConversationPhase = 'idle' | 'naming' | 'chatting'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export function ChatPage() {
  const [phase, setPhase] = useState<ConversationPhase>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [profileName, setProfileName] = useState('')
  const [pendingDescription, setPendingDescription] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const triggerAIResponse = async (userMessage: string) => {
    setIsTyping(true)
    try {
      const allMessages = [...messages, { role: 'user' as const, content: userMessage }]
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          profile_name: profileName,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
        throw new Error(errorData.detail || `Chat failed: ${res.status}`)
      }
      const data = await res.json()
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      // Store readiness signal for Phase 16 (summary view)
      if (data.ready_to_summarize && data.extracted_preferences) {
        console.log('[HomeMatch] Preferences ready:', data.extracted_preferences)
        // Phase 16 will add: transition to summary card view
      }
    } catch (err) {
      // Show error as an assistant message so user sees it in the thread
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, I encountered an error. Please try again. (${err instanceof Error ? err.message : 'Unknown error'})`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleStartCreating = (description: string) => {
    setPendingDescription(description)
    setPhase('naming')
  }

  const handleNameSubmit = (name: string) => {
    setProfileName(name)
    setPhase('chatting')
    const firstMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: pendingDescription,
      timestamp: new Date(),
    }
    setMessages([firstMessage])
    triggerAIResponse(pendingDescription)
  }

  const handleSendMessage = (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    triggerAIResponse(content)
  }

  return (
    <div
      className={cn(
        "flex flex-col mx-auto w-full max-w-3xl",
        "h-[calc(100dvh-3.5rem-2rem)]",
        phase === 'idle' ? "justify-center" : "justify-end"
      )}
    >
      {phase === 'chatting' && (
        <div className="mb-2 text-sm text-muted-foreground">
          Creating profile: <span className="font-medium text-foreground">{profileName}</span>
        </div>
      )}

      {phase === 'idle' && (
        <ChatInput onSend={handleStartCreating} showStartButton={true} />
      )}

      {phase === 'naming' && (
        <ProfileNamePrompt onSubmit={handleNameSubmit} />
      )}

      {phase === 'chatting' && (
        <>
          <div className="flex-1 overflow-y-auto space-y-6 pb-4">
            {messages.map((message) =>
              message.role === 'assistant' ? (
                <div key={message.id} className="flex gap-3 rounded-lg bg-muted/50 p-4">
                  <AIAvatar />
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[80%] p-4">
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )
            )}
            {isTyping && (
              <div className="flex gap-3 rounded-lg bg-muted/50 p-4">
                <AIAvatar />
                <TypingIndicator />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <ChatInput onSend={handleSendMessage} disabled={isTyping} showStartButton={false} />
        </>
      )}
    </div>
  )
}
