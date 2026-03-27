import { SlidersHorizontal, Globe, Sparkles } from 'lucide-react'

const STEPS = [
  {
    icon: SlidersHorizontal,
    number: 1,
    title: 'Set Preferences',
    description: 'Tell us your budget, desired location, commute needs, and must-have amenities.',
  },
  {
    icon: Globe,
    number: 2,
    title: 'Browse Listings',
    description: 'Explore Flatfox as usual — our extension shows scores right on the page.',
  },
  {
    icon: Sparkles,
    number: 3,
    title: 'Get AI Scores',
    description: 'Each listing is scored and explained so you can focus on the best matches.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-6 lg:px-16">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
          How It Works
        </h2>
        <p className="text-muted-foreground text-center mb-14 max-w-2xl mx-auto">
          Get started in three simple steps.
        </p>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-6 left-[16.67%] right-[16.67%] h-0.5 bg-border" />

          {STEPS.map(({ icon: Icon, number, title, description }) => (
            <div key={number} className="flex flex-col items-center text-center relative">
              <div className="flex items-center justify-center size-12 rounded-full bg-primary text-primary-foreground font-bold text-lg mb-4 z-10">
                {number}
              </div>
              <Icon className="size-6 text-primary mb-2" />
              <h3 className="font-semibold text-lg mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
