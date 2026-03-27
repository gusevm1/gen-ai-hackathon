'use client'

import { motion, useReducedMotion } from "motion/react"
import { t, type Language } from "@/lib/translations"

interface ChapterHookProps {
  lang: Language
}

export function ChapterHook({ lang }: ChapterHookProps) {
  const prefersReduced = useReducedMotion()

  const phrase1 = t(lang, 'landing_hook_phrase1')  // "Your next home."
  const phrase2 = t(lang, 'landing_hook_phrase2')  // "Already found."
  const phrase1Words = phrase1.split(' ')
  const phrase2Words = phrase2.split(' ')

  return (
    <section className="relative h-screen flex flex-col items-center justify-center bg-hero-bg overflow-hidden">
      <div className="text-center px-6">
        {/* Phrase 1 */}
        <p
          className="text-hero-fg font-bold"
          style={{
            fontSize: 'var(--text-display-size)',
            lineHeight: 'var(--text-display-lh)',
            letterSpacing: 'var(--text-display-ls)',
          }}
          aria-label={phrase1}
        >
          {phrase1Words.map((word, i) => (
            <motion.span
              key={`p1-${i}`}
              className="inline-block mr-[0.25em]"
              initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReduced ? { duration: 0 } : {
                delay: i * 0.12,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {word}
            </motion.span>
          ))}
        </p>

        {/* Phrase 2 — 500ms pause after phrase 1 last word */}
        <p
          className="text-hero-fg font-bold mt-2"
          style={{
            fontSize: 'var(--text-display-size)',
            lineHeight: 'var(--text-display-lh)',
            letterSpacing: 'var(--text-display-ls)',
          }}
          aria-label={phrase2}
        >
          {phrase2Words.map((word, i) => (
            <motion.span
              key={`p2-${i}`}
              className="inline-block mr-[0.25em]"
              initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReduced ? { duration: 0 } : {
                delay: 0.5 + i * 0.12,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {word}
            </motion.span>
          ))}
        </p>

        {/* HomeMatch logo — fades up after both phrases */}
        <motion.div
          className="mt-10 flex items-center justify-center gap-2"
          initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReduced ? { duration: 0 } : {
            delay: 1.2,
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {/* Teal circle icon + "HomeMatch" wordmark */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="16" fill="hsl(173 65% 52%)"/>
            <path d="M10 20V14l6-4 6 4v6h-4v-3h-4v3z" fill="hsl(0 0% 4%)" />
          </svg>
          <span
            className="text-hero-fg font-semibold tracking-tight"
            style={{ fontSize: 'var(--text-subheading-size)' }}
          >
            HomeMatch
          </span>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={prefersReduced ? { duration: 0 } : { delay: 2.0, duration: 0.6 }}
        aria-hidden="true"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M12 19l-5-5M12 19l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-hero-fg"/>
        </svg>
      </motion.div>
    </section>
  )
}
