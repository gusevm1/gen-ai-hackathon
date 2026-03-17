"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CopyExtensionsUrl() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText("chrome://extensions")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span className="inline-flex items-center gap-2">
      <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
        chrome://extensions
      </code>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleCopy}
        aria-label="Copy chrome://extensions URL"
      >
        {copied ? (
          <Check className="size-4 text-green-500" />
        ) : (
          <Copy className="size-4" />
        )}
      </Button>
    </span>
  )
}
