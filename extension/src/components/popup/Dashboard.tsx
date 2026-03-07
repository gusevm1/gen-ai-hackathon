import { useState, useEffect } from 'react';
import { storage } from 'wxt/utils/storage';
import { useProfile } from '@/hooks/useProfile';
import { toggleTheme, themeStorage } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Moon, Sun, Settings, Power } from 'lucide-react';

// -- Storage for extension toggle --

const extensionEnabledStorage = storage.defineItem<boolean>(
  'local:extensionEnabled',
  { fallback: true },
);

// -- Component --

export default function Dashboard() {
  const { profile, isLoading, hasProfile } = useProfile();
  const [isDark, setIsDark] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  // Load theme and toggle states
  useEffect(() => {
    themeStorage.getValue().then((theme) => setIsDark(theme === 'dark'));
    extensionEnabledStorage.getValue().then((val) => setIsEnabled(val));
  }, []);

  const handleThemeToggle = async () => {
    await toggleTheme();
    setIsDark((prev) => !prev);
  };

  const handleEnabledToggle = async (checked: boolean) => {
    setIsEnabled(checked);
    await extensionEnabledStorage.setValue(checked);
  };

  const openOnboarding = (edit: boolean = false) => {
    const url = edit
      ? browser.runtime.getURL('/onboarding.html?edit=true')
      : browser.runtime.getURL('/onboarding.html');
    browser.tabs.create({ url });
  };

  // -- Loading --

  if (isLoading) {
    return (
      <div className="min-w-[360px] p-4 flex items-center justify-center h-[200px]">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  // -- No profile state --

  if (!hasProfile || !profile) {
    return (
      <div className="min-w-[360px] max-w-[400px] p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-primary">HomeMatch</h1>
          <div className="flex items-center gap-1.5">
            <Sun className="h-3.5 w-3.5 text-muted-foreground" />
            <Switch
              checked={isDark}
              onCheckedChange={handleThemeToggle}
              aria-label="Toggle dark mode"
              className="scale-75"
            />
            <Moon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* CTA Card */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="pt-6 pb-6 text-center space-y-4">
            <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold text-foreground">Get Started</h2>
              <p className="text-sm text-muted-foreground">
                Set up your property preferences to get personalized match
                scores on Homegate.
              </p>
            </div>
            <Button
              onClick={() => openOnboarding(false)}
              className="rounded-xl bg-[#E4006E] hover:bg-[#E4006E]/90 text-white w-full"
            >
              Set Up Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -- Profile summary --

  // Format price display
  const formatPrice = (min?: number, max?: number, listingType?: string) => {
    if (!min && !max) return null;
    const suffix = listingType === 'rent' ? '/mo' : '';
    if (min && max) return `CHF ${min.toLocaleString()} - ${max.toLocaleString()}${suffix}`;
    if (min) return `from CHF ${min.toLocaleString()}${suffix}`;
    return `up to CHF ${max!.toLocaleString()}${suffix}`;
  };

  // Format rooms display
  const formatRooms = (min?: number, max?: number) => {
    if (!min && !max) return null;
    if (min && max) return `${min} - ${max} rooms`;
    if (min) return `${min}+ rooms`;
    return `up to ${max} rooms`;
  };

  // Format location display
  const formatLocation = () => {
    if (!profile.location) return null;
    const parts = [profile.location];
    if (profile.radiusKm) parts.push(`${profile.radiusKm}km`);
    return parts.join(', ');
  };

  // Top 3 weights
  const sortedWeights = Object.entries(profile.weights)
    .sort(([, a], [, b]) => b - a);
  const topWeights = sortedWeights.slice(0, 3);
  const remainingCount = Math.max(0, sortedWeights.length - 3);

  const priceDisplay = formatPrice(profile.priceMin, profile.priceMax, profile.listingType);
  const roomsDisplay = formatRooms(profile.roomsMin, profile.roomsMax);
  const locationDisplay = formatLocation();
  const featureCount = profile.features?.length ?? 0;
  const criteriaCount = profile.softCriteria?.length ?? 0;

  return (
    <div className="min-w-[360px] max-w-[400px] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-primary">HomeMatch</h1>
        <div className="flex items-center gap-1.5">
          <Sun className="h-3.5 w-3.5 text-muted-foreground" />
          <Switch
            checked={isDark}
            onCheckedChange={handleThemeToggle}
            aria-label="Toggle dark mode"
            className="scale-75"
          />
          <Moon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Profile Summary Card */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Your Preferences</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2.5">
          {/* Listing type badge */}
          <div className="flex items-center gap-2">
            {profile.listingType ? (
              <Badge variant="default" className="text-xs capitalize">
                {profile.listingType}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">Type not set</span>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Location</span>
            <span className="font-medium text-foreground truncate ml-2 max-w-[200px]">
              {locationDisplay ?? <span className="text-muted-foreground font-normal">Not set</span>}
            </span>
          </div>

          {/* Budget */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Budget</span>
            <span className="font-medium text-foreground">
              {priceDisplay ?? <span className="text-muted-foreground font-normal">Not set</span>}
            </span>
          </div>

          {/* Rooms */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Rooms</span>
            <span className="font-medium text-foreground">
              {roomsDisplay ?? <span className="text-muted-foreground font-normal">Not set</span>}
            </span>
          </div>

          {/* Features count */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Features</span>
            <span className="font-medium text-foreground">
              {featureCount > 0 ? (
                <Badge variant="secondary" className="text-xs">
                  {featureCount} selected
                </Badge>
              ) : (
                <span className="text-muted-foreground font-normal">None</span>
              )}
            </span>
          </div>

          {/* Soft criteria count */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Soft Criteria</span>
            <span className="font-medium text-foreground">
              {criteriaCount > 0 ? (
                <Badge variant="secondary" className="text-xs">
                  {criteriaCount} defined
                </Badge>
              ) : (
                <span className="text-muted-foreground font-normal">None</span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Weight Summary */}
      {topWeights.length > 0 && (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="px-4 py-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Top Priorities</p>
            <div className="space-y-1.5">
              {topWeights.map(([category, weight]) => (
                <div key={category} className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${weight}%` }}
                    />
                  </div>
                  <span className="text-xs text-foreground min-w-[80px] truncate">
                    {category}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums w-[40px] text-right">
                    {weight.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
            {remainingCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                +{remainingCount} more
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Actions */}
      <div className="space-y-3">
        {/* Extension toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Power className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="extension-toggle" className="text-sm cursor-pointer">
              Extension Active
            </Label>
          </div>
          <Switch
            id="extension-toggle"
            checked={isEnabled}
            onCheckedChange={handleEnabledToggle}
            aria-label="Toggle extension active"
          />
        </div>

        {/* Edit preferences button */}
        <Button
          variant="outline"
          onClick={() => openOnboarding(true)}
          className="w-full rounded-xl text-sm"
        >
          <Settings className="h-4 w-4 mr-2" />
          Edit Preferences
        </Button>

        {/* Last updated */}
        {profile.updatedAt && (
          <p className="text-xs text-muted-foreground text-center">
            Last updated:{' '}
            {new Date(profile.updatedAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        )}
      </div>
    </div>
  );
}
