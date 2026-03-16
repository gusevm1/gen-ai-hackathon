'use client'

import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  input: string
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
}

export function ChatInput({ input, onInputChange, onSubmit, isLoading }: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="border-t p-3 flex gap-2">
      <input
        type="text"
        value={input}
        onChange={onInputChange}
        placeholder="Ask about your ideal home..."
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        disabled={isLoading}
      />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        disabled={isLoading || !input.trim()}
        aria-label="Send message"
      >
        <Send className="size-4" />
      </Button>
    </form>
  )
}
