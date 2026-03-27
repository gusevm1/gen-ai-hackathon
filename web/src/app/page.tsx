import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesCarousel } from '@/components/landing/features-carousel'
import { HowItWorks } from '@/components/landing/how-it-works'
import { ExtensionCTA } from '@/components/landing/extension-cta'
import { Footer } from '@/components/landing/footer'

export default function Home() {
  return (
    <main>
      <HeroSection />
      <FeaturesCarousel />
      <HowItWorks />
      <ExtensionCTA />
      <Footer />
    </main>
  )
}
