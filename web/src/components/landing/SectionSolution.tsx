'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { ease } from '@/lib/motion'
import { t } from '@/lib/translations'
import type { Language } from '@/lib/translations'

// ─── Score color helper ───────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return { bg: 'hsl(142 71% 45% / 0.18)', color: '#10b981', border: 'hsl(142 71% 45% / 0.3)' }
  if (score >= 60) return { bg: 'hsl(38 92% 50% / 0.18)',  color: '#f59e0b', border: 'hsl(38 92% 50% / 0.3)'  }
  return              { bg: 'hsl(0 72% 51% / 0.18)',       color: '#ef4444', border: 'hsl(0 72% 51% / 0.3)'   }
}

// ─── Mock data (illustrative, not translated) ────────────────────────────────

const PROFILE_TEXT = '2BR in Zurich, max CHF 2,500, pet-friendly, near a park or lake'

const LISTINGS = [
  { addr: 'Seefeld, Zürich',    rooms: '3.5 Zi', price: 'CHF 2,450', score: 94 },
  { addr: 'Wipkingen, Zürich',  rooms: '4 Zi',   price: 'CHF 2,800', score: 88 },
  { addr: 'Enge, Zürich',       rooms: '3 Zi',   price: 'CHF 2,100', score: 82 },
  { addr: 'Wiedikon, Zürich',   rooms: '2.5 Zi', price: 'CHF 1,850', score: 71 },
]

const ANALYSIS_CATEGORIES = [
  { label: 'Location',    score: 9 },
  { label: 'Budget',      score: 8 },
  { label: 'Size',        score: 7 },
  { label: 'Amenities',   score: 9 },
  { label: 'Pet Policy',  score: 10 },
]

// ─── Scene components ─────────────────────────────────────────────────────────

function SceneProfile({ active }: { active: boolean }) {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (!active) { setTyped(''); return }
    let i = 0
    const id = setInterval(() => {
      i++
      setTyped(PROFILE_TEXT.slice(0, i))
      if (i >= PROFILE_TEXT.length) clearInterval(id)
    }, 38)
    return () => clearInterval(id)
  }, [active])

  return (
    <div className="flex flex-col h-full p-4 gap-3 text-sm">
      {/* AI message */}
      <div className="flex gap-2 items-start">
        <div
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
          style={{ backgroundColor: 'hsl(173 65% 52% / 0.2)', color: 'var(--color-hero-teal)' }}
        >
          AI
        </div>
        <div
          className="rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%] text-xs leading-relaxed"
          style={{ backgroundColor: 'hsl(0 0% 14%)', color: 'hsl(0 0% 75%)' }}
        >
          Tell me what you&apos;re looking for in a flat and I&apos;ll score every Flatfox listing for you.
        </div>
      </div>

      {/* User typing */}
      <div className="flex gap-2 items-start justify-end">
        <div
          className="rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] text-xs leading-relaxed"
          style={{ backgroundColor: 'hsl(173 65% 52% / 0.18)', color: 'hsl(0 0% 92%)' }}
        >
          {typed}
          {active && typed.length < PROFILE_TEXT.length && (
            <span
              className="inline-block w-0.5 h-3 ml-0.5 align-middle"
              style={{ backgroundColor: 'var(--color-hero-teal)', animation: 'blink 0.9s step-end infinite' }}
            />
          )}
        </div>
        <div
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
          style={{ backgroundColor: 'hsl(0 0% 18%)', color: 'hsl(0 0% 60%)' }}
        >
          Me
        </div>
      </div>

      {/* AI reply (appears after typing finishes) */}
      <AnimatePresence>
        {typed.length >= PROFILE_TEXT.length && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex gap-2 items-start"
          >
            <div
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
              style={{ backgroundColor: 'hsl(173 65% 52% / 0.2)', color: 'var(--color-hero-teal)' }}
            >
              AI
            </div>
            <div
              className="rounded-2xl rounded-tl-sm px-3 py-2 text-xs leading-relaxed"
              style={{ backgroundColor: 'hsl(0 0% 14%)', color: 'hsl(0 0% 75%)' }}
            >
              Got it! Scanning Flatfox for listings that match your profile…
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AnimatedScore({ score, active }: { score: number; active: boolean }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!active) { setDisplay(0); return }
    const target = score
    let current = 0
    const step = Math.ceil(target / 24)
    const id = setInterval(() => {
      current = Math.min(current + step, target)
      setDisplay(current)
      if (current >= target) clearInterval(id)
    }, 45)
    return () => clearInterval(id)
  }, [active, score])

  const colors = scoreColor(score)
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-md tabular-nums"
      style={{
        backgroundColor: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
      }}
    >
      {display}%
    </span>
  )
}

function SceneListings({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col h-full p-4 gap-1">
      <p className="text-xs mb-3 font-medium" style={{ color: 'hsl(0 0% 50%)' }}>
        {LISTINGS.length} listings matched your profile
      </p>
      {LISTINGS.map((l, i) => (
        <motion.div
          key={l.addr}
          initial={{ opacity: 0, x: -16 }}
          animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
          transition={{ delay: active ? i * 0.12 : 0, duration: 0.35, ease: ease.enter }}
          className="flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer"
          style={{
            backgroundColor: i === 0 ? 'hsl(173 65% 52% / 0.08)' : 'hsl(0 0% 9%)',
            border: `1px solid ${i === 0 ? 'hsl(173 65% 52% / 0.2)' : 'hsl(0 0% 100% / 0.06)'}`,
          }}
        >
          <div>
            <p className="text-xs font-semibold leading-tight" style={{ color: 'hsl(0 0% 90%)' }}>
              {l.addr}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'hsl(0 0% 45%)' }}>
              {l.rooms} · {l.price} / mo
            </p>
          </div>
          <AnimatedScore score={l.score} active={active} />
        </motion.div>
      ))}
    </div>
  )
}

function AnimatedBar({ score, active, delay }: { score: number; active: boolean; delay: number }) {
  return (
    <div
      className="h-1.5 rounded-full overflow-hidden"
      style={{ backgroundColor: 'hsl(0 0% 15%)' }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: 'var(--color-hero-teal)' }}
        initial={{ width: 0 }}
        animate={active ? { width: `${score * 10}%` } : { width: 0 }}
        transition={{ delay: active ? delay : 0, duration: 0.6, ease: ease.enter }}
      />
    </div>
  )
}

function SceneAnalysis({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* Back + title */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium" style={{ color: 'hsl(0 0% 45%)' }}>
          ← Back
        </span>
        <span className="text-xs font-semibold" style={{ color: 'hsl(0 0% 85%)' }}>
          Seefeld, 3.5 Zi · CHF 2,450
        </span>
      </div>

      {/* Overall score */}
      <div
        className="flex items-center justify-between rounded-xl px-4 py-3"
        style={{
          backgroundColor: scoreColor(94).bg,
          border: `1px solid ${scoreColor(94).border}`,
        }}
      >
        <span className="text-xs font-semibold" style={{ color: scoreColor(94).color }}>
          Overall Match Score
        </span>
        <motion.span
          className="text-2xl font-black"
          style={{ color: scoreColor(94).color }}
          initial={{ opacity: 0 }}
          animate={active ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.2 }}
        >
          94%
        </motion.span>
      </div>

      {/* Category bars */}
      <div className="flex flex-col gap-2.5">
        {ANALYSIS_CATEGORIES.map(({ label, score }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0 }}
            animate={active ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: active ? 0.15 + i * 0.08 : 0 }}
          >
            <div className="flex justify-between mb-1">
              <span className="text-[11px]" style={{ color: 'hsl(0 0% 55%)' }}>{label}</span>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'hsl(0 0% 75%)' }}>
                {score}/10
              </span>
            </div>
            <AnimatedBar score={score} active={active} delay={0.25 + i * 0.1} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Browser chrome wrapper ───────────────────────────────────────────────────

function MockBrowser({ scene }: { scene: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden w-full"
      style={{
        border: '1px solid hsl(0 0% 100% / 0.1)',
        backgroundColor: 'hsl(0 0% 7%)',
        boxShadow: '0 32px 64px hsl(0 0% 0% / 0.5), 0 0 0 1px hsl(0 0% 100% / 0.05)',
      }}
    >
      {/* Browser chrome */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: 'hsl(0 0% 100% / 0.07)', backgroundColor: 'hsl(0 0% 9%)' }}
      >
        {/* Traffic lights */}
        <div className="flex gap-1.5">
          {['hsl(0 80% 55%)', 'hsl(38 80% 55%)', 'hsl(130 55% 45%)'].map((c) => (
            <div
              key={c}
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        {/* URL bar */}
        <div
          className="flex-1 max-w-xs mx-auto rounded-md px-3 py-1 text-xs text-center"
          style={{
            backgroundColor: 'hsl(0 0% 13%)',
            color: 'hsl(0 0% 45%)',
            border: '1px solid hsl(0 0% 100% / 0.07)',
          }}
        >
          homematch.app/dashboard
        </div>
      </div>

      {/* Content area */}
      <div style={{ height: 360, overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: ease.enter }}
            style={{ height: '100%' }}
          >
            {scene === 0 && <SceneProfile active />}
            {scene === 1 && <SceneListings active />}
            {scene === 2 && <SceneAnalysis active />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

const STEPS = [
  { num: '01', labelKey: 'landing_howit_step1_label' as const, bodyKey: 'landing_howit_step1_body' as const },
  { num: '02', labelKey: 'landing_howit_step2_label' as const, bodyKey: 'landing_howit_step2_body' as const },
  { num: '03', labelKey: 'landing_howit_step3_label' as const, bodyKey: 'landing_howit_step3_body' as const },
]

const SCENE_DURATION = 5000 // ms per scene

export function SectionSolution({ lang }: { lang: Language }) {
  const prefersReduced = useReducedMotion()
  const [scene, setScene] = useState(0)

  const advance = useCallback(() => {
    setScene((s) => (s + 1) % 3)
  }, [])

  // Auto-advance timer
  useEffect(() => {
    if (prefersReduced) return
    const id = setInterval(advance, SCENE_DURATION)
    return () => clearInterval(id)
  }, [advance, prefersReduced])

  return (
    <section className="py-32 px-6" style={{ backgroundColor: 'var(--color-hero-bg)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.4 }}
          transition={{ duration: 0.6, ease: ease.enter }}
          className="mb-16 text-center"
        >
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-4"
            style={{ color: 'var(--color-hero-teal)' }}
          >
            {t(lang, 'landing_howit_overline')}
          </p>
          <h2
            className="font-bold tracking-tight"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              lineHeight: 1.1,
              color: 'var(--color-hero-fg)',
            }}
          >
            {t(lang, 'landing_howit_headline')}
          </h2>
        </motion.div>

        {/* Browser demo */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 0.7, ease: ease.enter }}
          className="max-w-3xl mx-auto mb-12"
        >
          <MockBrowser scene={scene} />
        </motion.div>

        {/* Step tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 max-w-3xl mx-auto">
          {STEPS.map(({ num, labelKey, bodyKey }, i) => {
            const active = scene === i
            return (
              <button
                key={num}
                onClick={() => setScene(i)}
                className="flex-1 text-left rounded-2xl px-8 py-8 transition-all duration-300"
                style={{
                  backgroundColor: active ? 'hsl(173 65% 52% / 0.1)' : 'hsl(0 0% 100% / 0.03)',
                  border: `1px solid ${active ? 'hsl(173 65% 52% / 0.3)' : 'hsl(0 0% 100% / 0.07)'}`,
                  cursor: 'pointer',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: active ? 'var(--color-hero-teal)' : 'hsl(0 0% 35%)' }}
                  >
                    {num}
                  </span>
                  {/* Progress bar for active step */}
                  {active && !prefersReduced && (
                    <div
                      className="flex-1 h-0.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'hsl(173 65% 52% / 0.2)' }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: 'var(--color-hero-teal)' }}
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: SCENE_DURATION / 1000, ease: 'linear' }}
                        key={scene}
                      />
                    </div>
                  )}
                </div>
                <p
                  className="text-lg font-semibold leading-tight mb-2"
                  style={{ color: active ? 'var(--color-hero-fg)' : 'hsl(0 0% 50%)' }}
                >
                  {t(lang, labelKey)}
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: active ? 'hsl(0 0% 58%)' : 'hsl(0 0% 32%)' }}
                >
                  {t(lang, bodyKey)}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Blink keyframe for cursor */}
      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </section>
  )
}
