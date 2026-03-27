'use client'

import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { Sparkles, Chrome, MessageSquare } from 'lucide-react'

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Scoring',
    description:
      'Every listing is scored against your personal preferences — budget, location, commute, amenities and more.',
    image: '/images/feature-scoring.jpg',
  },
  {
    icon: Chrome,
    title: 'Browser Extension',
    description:
      'See match scores directly on Flatfox listings as you browse, without leaving the page.',
    image: '/images/feature-extension.jpg',
  },
  {
    icon: MessageSquare,
    title: 'Property Chat',
    description:
      'Ask questions about any listing and get instant AI-powered answers based on the listing details.',
    image: '/images/feature-chat.jpg',
  },
]

function FeatureCard({ feature }: { feature: (typeof FEATURES)[number] }) {
  const Icon = feature.icon
  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="relative h-48 w-full">
        <Image
          src={feature.image}
          alt={feature.title}
          fill
          className="object-cover"
        />
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="size-5 text-primary" />
          <h3 className="font-semibold text-lg">{feature.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
      </div>
    </div>
  )
}

export function FeaturesCarousel() {
  const [emblaRef] = useEmblaCarousel(
    { loop: true, align: 'start', slidesToScroll: 1 },
    [Autoplay({ delay: 4000, stopOnInteraction: true })]
  )

  return (
    <section className="py-20 px-6 lg:px-16 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
          Everything You Need
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          From AI-powered scoring to real-time chat, HomeMatch gives you the tools
          to find your perfect Swiss apartment.
        </p>

        {/* Mobile carousel */}
        <div className="md:hidden overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex-[0_0_85%] min-w-0">
                <FeatureCard feature={feature} />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  )
}
