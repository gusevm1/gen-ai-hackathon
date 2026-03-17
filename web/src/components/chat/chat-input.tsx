"use client"

import { useRef, useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  showStartButton?: boolean
}

export function ChatInput({ onSend, disabled = false, showStartButton = false }: ChatInputProps) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Describe your ideal property — location, budget, rooms, size, lifestyle, nearby amenities like train stations, schools, supermarkets, cafes..."
          className={cn(
            "min-h-[80px] max-h-[200px] w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !showStartButton && "pr-12"
          )}
        />
        {!showStartButton && (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className="absolute bottom-3 right-3 size-8 rounded-full"
          >
            <Send className="size-4" />
          </Button>
        )}
      </div>
      {showStartButton && (
        <Button
          size="lg"
          onClick={handleSend}
          disabled={!value.trim()}
          className="w-full rounded-full py-6 text-lg font-semibold"
        >
          Start Creating Profile
        </Button>
      )}
    </div>
  )
}
