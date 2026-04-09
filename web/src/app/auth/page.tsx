'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/components/logo'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    // Check alpha approval
    const res = await fetch('/api/admin/check-alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase().trim() }),
    })

    if (!res.ok) {
      // Not approved — sign out immediately
      await supabase.auth.signOut()
      setError("Your account hasn't been approved for alpha access yet. Join the waitlist on the homepage.")
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      {/* Zurich cityscape photo background */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <Image
          src="/zurich_bg_grossmuenster.webp"
          alt=""
          fill
          className="object-cover"
        />
        {/* Dark overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'hsl(0 0% 0% / 0.50)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Logo size="lg" />
          <p className="text-sm text-muted-foreground">Your AI-powered Swiss property advisor</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>
              Sign in to your HomeMatch account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Please wait...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center pt-0">
            <p className="text-sm text-muted-foreground">
              {"Don't have access? "}{' '}
              <Link href="/" className="font-medium text-primary hover:underline">
                Join the waitlist
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Credits strip at bottom */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3 z-10">
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'hsl(0 0% 55%)' }}>
          A project from
        </p>
        <div className="flex items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/eth-zurich-white.svg" alt="ETH Zürich" className="h-7 w-auto opacity-90" />
          <div className="h-7 w-px bg-white/20" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/genai-hackathon-logo.png" alt="GenAI Zürich Hackathon 2026" className="h-8 w-auto opacity-90" />
        </div>
      </div>
    </div>
  )
}
