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

const mockAIResponse = async (userMessage: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        "That sounds great! Could you tell me more about your budget range and preferred neighborhood? Also, are there any specific amenities nearby that are important to you \u2014 like public transport, schools, or parks?"
      )
    }, 1500)
  })
}

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
      const response = await mockAIResponse(userMessage)
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
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
