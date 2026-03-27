import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

function BrowserMockup() {
  return (
    <div className="rounded-xl border bg-card shadow-lg overflow-hidden max-w-md mx-auto">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/60 border-b">
        <div className="flex gap-1.5">
          <div className="size-3 rounded-full bg-red-400" />
          <div className="size-3 rounded-full bg-yellow-400" />
          <div className="size-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground truncate">
            flatfox.ch/en/listing/example-apartment
          </div>
        </div>
      </div>

      {/* Fake page content */}
      <div className="p-6 space-y-3">
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-5/6" />

        {/* Simulated HomeMatch badge */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2">
          <div className="flex items-center justify-center size-8 rounded-md bg-primary text-primary-foreground font-bold text-sm">
            87
          </div>
          <div>
            <p className="text-xs font-medium">HomeMatch Score</p>
            <p className="text-xs text-muted-foreground">Great match!</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ExtensionCTA() {
  return (
    <section className="py-20 px-6 lg:px-16 bg-muted/30">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Browser mockup */}
        <div className="order-2 lg:order-1">
          <BrowserMockup />
        </div>

        {/* Copy + CTA */}
        <div className="order-1 lg:order-2">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Scores Right Where You Browse
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg">
            Install the HomeMatch Chrome extension and see AI match scores
            directly on Flatfox listing pages. No extra tabs, no context switching
            — just instant insights while you apartment hunt.
          </p>
          <Link
            href="/download"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground cursor-pointer hover:bg-primary/90 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
          >
            Set Up Extension
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
