"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProfileNamePromptProps {
  onSubmit: (name: string) => void
}

export function ProfileNamePrompt({ onSubmit }: ProfileNamePromptProps) {
  const [name, setName] = useState("")

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (trimmed) {
      onSubmit(trimmed)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && name.trim()) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 rounded-xl border bg-card p-6">
      <h2 className="text-lg font-semibold">What should we call this profile?</h2>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g., Zurich Family Apartment"
        className="w-full rounded-lg border border-input bg-background px-4 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button
        size="lg"
        onClick={handleSubmit}
        disabled={!name.trim()}
        className="w-full gap-2"
      >
        Start Conversation
        <ArrowRight className="size-4" />
      </Button>
    </div>
  )
}
