import Link from 'next/link'
import { Logo } from '@/components/logo'
import { t, type Language } from '@/lib/translations'

interface LandingFooterProps {
  lang: Language
}

export function LandingFooter({ lang }: LandingFooterProps) {
  return (
    <footer className="border-t border-white/10 py-10 px-6" style={{ backgroundColor: 'var(--color-hero-bg)' }}>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo size="sm" className="text-white [&_span]:text-white" />
        <p className="text-white/50 text-sm">
          {t(lang, 'landing_footer_copyright')}
        </p>
        <Link
          href="/privacy-policy"
          className="text-white/50 text-sm hover:text-white transition-colors"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  )
}
