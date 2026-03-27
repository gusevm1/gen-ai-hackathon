import Link from 'next/link'
import { Logo } from '@/components/logo'
import { t, type Language } from '@/lib/translations'

interface LandingFooterProps {
  lang: Language
}

export function LandingFooter({ lang }: LandingFooterProps) {
  return (
    <footer className="bg-background border-t border-border py-10 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo size="sm" />
        <p className="text-muted-foreground text-sm">
          {t(lang, 'landing_footer_copyright')}
        </p>
        <Link
          href="/privacy-policy"
          className="text-muted-foreground text-sm hover:text-foreground transition-colors"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  )
}
