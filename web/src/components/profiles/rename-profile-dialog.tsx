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

interface RenameProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  onRename: (newName: string) => void
}

export function RenameProfileDialog({
  open,
  onOpenChange,
  currentName,
  onRename,
}: RenameProfileDialogProps) {
  const [name, setName] = useState(currentName)
  const inputRef = useRef<HTMLInputElement>(null)
  const { language } = useLanguage()

  useEffect(() => {
    if (open) {
      setName(currentName)
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [open, currentName])

  function handleSave() {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    onRename(trimmed)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(language, 'profile_rename_title')}</DialogTitle>
          <DialogDescription>{t(language, 'profile_rename_desc')}</DialogDescription>
        </DialogHeader>
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSave()
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t(language, 'cancel')}
          </Button>
          <Button onClick={handleSave} disabled={name.trim().length === 0}>
            {t(language, 'save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
