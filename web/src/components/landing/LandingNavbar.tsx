'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { t, type Language } from '@/lib/translations'
import { createClient } from '@/lib/supabase/client'

interface LandingNavbarProps {
  lang: Language
}

export function LandingNavbar({ lang }: LandingNavbarProps) {
  const { scrollY } = useScroll()
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 1])
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
    })
  }, [])

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backgroundColor: useTransform(
          bgOpacity,
          (v) => `hsl(0 0% 4% / ${v})`
        ),
        backdropFilter: useTransform(
          bgOpacity,
          (v) => v > 0.1 ? 'blur(12px)' : 'none'
        ),
        borderBottom: useTransform(
          bgOpacity,
          (v) => v > 0.1 ? '1px solid hsl(0 0% 100% / 0.08)' : '1px solid transparent'
        ),
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo showText className="text-hero-fg" />
        {isLoggedIn ? (
          <Button render={<Link href="/dashboard" />} variant="ghost" className="text-hero-fg hover:bg-white/10 hover:text-hero-fg">
            Go to Dashboard
          </Button>
        ) : (
          <Button render={<Link href="/auth" />} variant="ghost" className="text-hero-fg hover:bg-white/10 hover:text-hero-fg">
            {t(lang, 'landing_nav_signin')}
          </Button>
        )}
      </div>
    </motion.header>
  )
}
