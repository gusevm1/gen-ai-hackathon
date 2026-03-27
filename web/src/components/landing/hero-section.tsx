'use client'

import Image from 'next/image'
import { Sparkles, Chrome, MessageSquare, ArrowDown } from 'lucide-react'
import { Logo } from '@/components/logo'
import { AuthCard } from './auth-card'

const BULLETS = [
  { icon: Sparkles, text: 'AI-powered property scoring' },
  { icon: Chrome, text: 'Browser extension for Flatfox' },
  { icon: MessageSquare, text: 'Chat with your property advisor' },
]

export function HeroSection() {
  return (
    <section className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left — image + copy */}
      <div className="relative flex flex-col justify-center px-8 py-16 lg:px-16 lg:py-24 min-h-[50vh] lg:min-h-screen">
        <Image
          src="/images/hero-zurich.jpg"
          alt="Swiss cityscape"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />

        <div className="relative z-10 max-w-lg">
          <Logo size="lg" className="text-white [&_svg]:text-white mb-6" />
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            Find Your Perfect Home in Switzerland
          </h1>
          <p className="text-base lg:text-lg text-white/80 mb-8">
            AI-powered apartment matching for the Swiss rental market.
            Score listings, compare features, and get personalized recommendations.
          </p>

          <ul className="space-y-3 mb-8">
            {BULLETS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <Icon className="size-5 text-primary shrink-0" />
                <span>{text}</span>
              </li>
            ))}
          </ul>

        </div>
      </div>

      {/* Right — image background + auth form */}
      <div className="relative flex flex-col items-center justify-center px-6 py-12 lg:py-0 min-h-[60vh] lg:min-h-screen">
        <Image
          src="/images/hero-aerial.jpg"
          alt="Aerial view of Zurich"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-white/60 dark:bg-black/50" />

        <div className="relative z-10 w-full max-w-md">
          <AuthCard />
        </div>

        {/* Affiliations */}
        <div className="relative z-10 mt-8 flex flex-col items-center gap-3">
          <span className="text-sm font-medium text-foreground/70">A project from</span>
          <div className="flex items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/eth-logo-black.svg"
              alt="ETH Zürich"
              className="h-7 dark:hidden"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/eth-logo.svg"
              alt="ETH Zürich"
              className="h-7 hidden dark:block"
            />
            <span className="text-border">|</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/genai-hackathon-logo.png"
              alt="GenAI Zürich Hackathon 2026"
              className="h-7"
            />
          </div>
        </div>
      </div>

      {/* Centered scroll button with pulse ring */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 relative">
        <span className="absolute inset-0 rounded-full bg-primary/25" style={{ animation: 'subtle-ping 2.5s ease-out infinite' }} />
        <button
          onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
          className="relative inline-flex items-center gap-2.5 rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground cursor-pointer hover:bg-primary/90 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
        >
          Learn More <ArrowDown className="size-5" />
        </button>
      </div>
    </section>
  )
}
