'use client'

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import Image from 'next/image'
import { t } from '@/lib/translations'
import type { Language } from '@/lib/translations'


export function SectionCredits({ lang }: { lang: Language }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: false, amount: 0.3 })

  return (
    <section className="relative overflow-hidden" style={{ minHeight: '50vh' }}>
      {/* Photo layer */}
      <div className="absolute inset-0" aria-hidden>
        <Image
          src="/zurich_bg_grossmuenster.webp"
          alt=""
          fill
          className="object-cover object-top"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, hsl(0 0% 0% / 0.50) 0%, hsl(0 0% 0% / 0.65) 100%)',
          }}
        />
      </div>

      {/* Main content */}
      <div
        ref={ref}
        className="relative z-10 flex flex-col items-center justify-center min-h-[50vh] py-16 px-6 text-center"
      >
        <motion.div
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center gap-8"
        >
          <p
            className="text-xs uppercase tracking-widest font-semibold"
            style={{ color: 'hsl(0 0% 55%)' }}
          >
            {t(lang, 'landing_credits_label')}
          </p>

          <div className="flex items-center gap-6">
            {/* ETH Zürich logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/eth-zurich-white.svg"
              alt="ETH Zürich"
              className="h-8 w-auto opacity-90"
            />

            {/* Vertical divider */}
            <div className="h-8 w-px bg-white/20" aria-hidden />

            {/* GenAI Hackathon logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/genai-hackathon-logo.png"
              alt="GenAI Zürich Hackathon 2026"
              className="h-10 w-auto opacity-90"
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
