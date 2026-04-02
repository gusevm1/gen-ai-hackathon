'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { saveProfilePhone } from '@/app/(dashboard)/profiles/actions'

interface ContactDetailsCardProps {
  profileId: string
  phone: string | null
  userName: string
  userEmail: string
}

export function ContactDetailsCard({ profileId, phone, userName, userEmail }: ContactDetailsCardProps) {
  const [phoneValue, setPhoneValue] = useState(phone ?? '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      await saveProfilePhone(profileId, phoneValue)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={userName} readOnly className="bg-muted/50" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={userEmail} readOnly className="bg-muted/50" />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <div className="flex gap-2">
            <Input
              value={phoneValue}
              onChange={e => setPhoneValue(e.target.value)}
              type="tel"
            />
            <Button onClick={handleSave} disabled={isPending} size="sm">
              {saved ? 'Saved' : isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
