"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChatInput, type ChatInputHandle } from "./chat-input"
import { AIAvatar } from "./ai-avatar"
import { TypingIndicator } from "./typing-indicator"
import { PreferenceSummaryCard } from "./preference-summary-card"
import { FadeIn } from "@/components/motion/FadeIn"
import ReactMarkdown from "react-markdown"
import { useLanguage } from "@/lib/language-context"

type ConversationPhase = 'chatting' | 'summarizing'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function ChatPage() {
  const [phase, setPhase] = useState<ConversationPhase>('chatting')
  const [messages, setMessages] = useState<Message[]>([])
  // apiMessages tracks only the messages sent to/from the backend (excludes initial greeting)
  const [apiMessages, setApiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [extractedPreferences, setExtractedPreferences] = useState<Record<string, unknown> | null>(null)
  const chatInputRef = useRef<ChatInputHandle>(null)
  const greetingFetched = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { language } = useLanguage()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Auto-focus chat input after AI response completes
  useEffect(() => {
    if (!isTyping) {
      const timer = setTimeout(() => chatInputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isTyping])

  // Fetch initial AI greeting on mount
  useEffect(() => {
    if (greetingFetched.current) return
    greetingFetched.current = true

    const fetchGreeting = async () => {
      setIsTyping(true)
      try {
        const res = await fetch(`/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [], profile_name: '', language }),
        })
        if (!res.ok) return
        const data = await res.json()
        const greetingMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        }
        setMessages([greetingMessage])
        // The greeting is display-only; it is NOT added to apiMessages
        // so the first real user message starts a clean conversation
      } catch {
        // Silently fail — user can still type without a greeting
      } finally {
        setIsTyping(false)
      }
    }

    fetchGreeting()
  }, [])

  const callChatApi = async (
    userContent: string,
    currentApiMessages: { role: 'user' | 'assistant'; content: string }[]
  ) => {
    setIsTyping(true)
    try {
      const updatedApiMessages = [...currentApiMessages, { role: 'user' as const, content: userContent }]
      const res = await fetch(`/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedApiMessages,
          profile_name: '',
          language,
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

      const newApiMessages: { role: 'user' | 'assistant'; content: string }[] = [
        ...updatedApiMessages,
        { role: 'assistant', content: data.message },
      ]
      setApiMessages(newApiMessages)

      if (data.ready_to_summarize && data.extracted_preferences) {
        setExtractedPreferences(data.extracted_preferences)
        setPhase('summarizing')
      }
    } catch (err) {
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

  const handleSendMessage = (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    callChatApi(content, apiMessages)
  }

  const handleProfileCreated = (profileId: string) => {
    router.push(`/profiles/${profileId}`)
  }

  const handleContinueChatting = () => {
    setPhase('chatting')
    setExtractedPreferences(null)
  }

  return (
    <div
      className={cn(
        "flex flex-col mx-auto w-full max-w-3xl",
        "h-[calc(100dvh-3.5rem-2rem)] justify-end"
      )}
    >
      <div className="flex-1 overflow-y-auto space-y-6 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-4 pb-8 min-h-[16rem]">
            <h2 className="text-2xl font-bold">Create a Profile</h2>
            <p className="text-muted-foreground max-w-sm text-sm">
              Answer a few questions and AI will build your search profile.
            </p>
          </div>
        )}
        {messages.map((message) =>
          message.role === 'assistant' ? (
            <div key={message.id} className="flex gap-3 rounded-lg bg-muted/50 p-4">
              <AIAvatar />
              <div className="flex-1">
                <div className="text-sm leading-relaxed [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
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
        {phase === 'summarizing' && extractedPreferences && (
          <FadeIn animate="visible">
            <PreferenceSummaryCard
              extractedPreferences={extractedPreferences}
              onProfileCreated={handleProfileCreated}
              onContinueChatting={handleContinueChatting}
            />
          </FadeIn>
        )}
        <div ref={bottomRef} />
      </div>
      <ChatInput
        ref={chatInputRef}
        onSend={handleSendMessage}
        disabled={isTyping || phase === 'summarizing'}
      />
    </div>
  )
}
