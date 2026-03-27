'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/lib/language-context'
import { t } from '@/lib/translations'

interface CreateProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => void
}

export function CreateProfileDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateProfileDialogProps) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { language } = useLanguage()

  useEffect(() => {
    if (open) {
      setName('')
      // Auto-focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  function handleCreate() {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    onCreate(trimmed)
    onOpenChange(false)
    setName('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(language, 'profile_create_title')}</DialogTitle>
          <DialogDescription>{t(language, 'profile_create_desc')}</DialogDescription>
        </DialogHeader>
        <Input
          ref={inputRef}
          placeholder={t(language, 'profile_create_placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleCreate()
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t(language, 'cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={name.trim().length === 0}>
            {t(language, 'create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
