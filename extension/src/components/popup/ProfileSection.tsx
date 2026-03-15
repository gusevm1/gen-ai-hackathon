import { Card, CardContent } from '@/components/ui/card';

export interface Profile {
  id: string;
  name: string;
  is_default: boolean;
}

interface ProfileSectionProps {
  profiles: Profile[];
  activeProfileId: string | null;
  onSwitch: (profileId: string) => void;
  isLoading: boolean;
}

export function ProfileSection({
  profiles,
  activeProfileId,
  onSwitch,
  isLoading,
}: ProfileSectionProps) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="px-4 py-3">
        <p className="text-xs text-muted-foreground mb-1.5">Active Profile</p>

        {isLoading ? (
          <div className="h-8 w-full rounded bg-muted animate-pulse" />
        ) : profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No profiles found.{' '}
            <button
              type="button"
              onClick={() =>
                browser.tabs.create({
                  url: 'https://homematch-web.vercel.app/profiles',
                })
              }
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Create one on the website
            </button>
          </p>
        ) : (
          <select
            value={activeProfileId ?? ''}
            onChange={(e) => onSwitch(e.target.value)}
            className="w-full truncate rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </CardContent>
    </Card>
  );
}
