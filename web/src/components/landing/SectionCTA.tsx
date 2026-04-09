'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { spring } from '@/lib/motion'
import { t } from '@/lib/translations'
import type { Language } from '@/lib/translations'

export function SectionCTA({ lang }: { lang: Language }) {
  const prefersReduced = useReducedMotion()
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const headlineInView = useInView(headlineRef, { once: false, amount: 0.6 })

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section
      className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden"
      style={{ backgroundColor: 'var(--color-hero-bg)' }}
    >
      {/* Radial teal glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, hsl(342 89% 50% / 0.13) 0%, transparent 70%)',
        }}
      />

      <motion.div
        className="relative z-10 max-w-xl w-full"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <p
          className="text-xs uppercase tracking-widest font-semibold mb-4"
          style={{ color: 'var(--color-hero-teal)' }}
        >
          {t(lang, 'landing_cta_overline')}
        </p>
        <motion.h2
          ref={headlineRef}
          className="font-bold tracking-tight mb-4"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            lineHeight: 1.1,
            color: 'var(--color-hero-fg)',
          }}
          initial={{ opacity: 0, y: 60 }}
          animate={prefersReduced ? { opacity: 1, y: 0 } : {
            opacity: headlineInView ? 1 : 0,
            y: headlineInView ? 0 : 60,
          }}
          transition={spring.gentle}
        >
          {t(lang, 'landing_cta_headline')}
        </motion.h2>
        <p
          className="text-lg leading-relaxed mb-8"
          style={{ color: 'hsl(0 0% 70%)' }}
        >
          {t(lang, 'landing_cta_subtext')}
        </p>

        {status === 'success' ? (
          <p className="text-lg font-semibold" style={{ color: 'var(--color-hero-teal)' }}>
            {t(lang, 'waitlist_success')}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t(lang, 'waitlist_placeholder')}
              className="w-full sm:w-72 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-rose-500 text-base"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-8 py-3 text-base font-semibold rounded-xl disabled:opacity-50"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                boxShadow: '0 0 32px hsl(342 89% 50% / 0.28)',
              }}
            >
              {status === 'loading' ? '...' : t(lang, 'waitlist_button')}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="text-sm text-red-400 mt-3">{t(lang, 'waitlist_error')}</p>
        )}

        <p className="mt-6 text-sm" style={{ color: 'hsl(0 0% 50%)' }}>
          <Link href="/auth" className="hover:underline" style={{ color: 'var(--color-hero-teal)' }}>
            {t(lang, 'waitlist_signin')}
          </Link>
        </p>
      </motion.div>
    </section>
  )
}
