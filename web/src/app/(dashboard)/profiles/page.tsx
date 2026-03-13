import { ShimmerButton } from "@/components/ui/shimmer-button"

export default function ProfilesPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">Profiles</h1>
      <p className="text-muted-foreground mb-6">
        Manage your search profiles here. Coming soon.
      </p>
      <ShimmerButton
        background="hsl(var(--primary))"
        className="shadow-lg"
      >
        <span className="text-sm font-medium text-primary-foreground">
          Create Profile
        </span>
      </ShimmerButton>
    </div>
  )
}
