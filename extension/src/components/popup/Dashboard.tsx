import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Settings, BarChart3, LogOut } from 'lucide-react';
import LoginForm from '@/components/popup/LoginForm';
import { ProfileSection, type Profile } from '@/components/popup/ProfileSection';
import { ConnectionStatus } from '@/components/popup/ConnectionStatus';
import { activeProfileStorage } from '@/storage/active-profile';

interface SessionState {
  user?: {
    email?: string;
    id?: string;
  };
  access_token?: string;
}

export default function Dashboard() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'getSession',
      });
      setSession(response?.session ?? null);
    } catch {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'getProfiles',
      });
      const profileList: Profile[] = response?.profiles ?? [];
      setProfiles(profileList);

      const active = profileList.find((p) => p.is_default) ?? profileList[0];
      if (active) {
        setActiveProfileId(active.id);
        await activeProfileStorage.setValue({ id: active.id, name: active.name });
      }
    } catch {
      // profiles remain empty
    } finally {
      setProfilesLoading(false);
    }
  };

  const handleHealthCheck = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'healthCheck',
      });
      setIsConnected(response?.connected ?? false);
    } catch {
      setIsConnected(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  // Fetch profiles and run health check after session loads (only when authenticated)
  useEffect(() => {
    if (!isLoading && session?.user) {
      fetchProfiles();
      handleHealthCheck();
    }
  }, [isLoading, session]);

  const handleSignOut = async () => {
    await browser.runtime.sendMessage({ action: 'signOut' });
    await activeProfileStorage.setValue(null);
    setSession(null);
  };

  const handleProfileSwitch = async (profileId: string) => {
    const response = await browser.runtime.sendMessage({
      action: 'switchProfile',
      profileId,
    });

    if (response?.error) {
      console.error('Failed to switch profile:', response.error);
      return;
    }

    // Update local state: toggle is_default flags
    const updated = profiles.map((p) => ({
      ...p,
      is_default: p.id === profileId,
    }));
    setProfiles(updated);
    setActiveProfileId(profileId);

    // Update storage so content script picks up the change
    const switched = updated.find((p) => p.id === profileId);
    if (switched) {
      await activeProfileStorage.setValue({ id: switched.id, name: switched.name });
    }
  };

  const openPreferences = () => {
    browser.tabs.create({ url: 'https://homematch-web.vercel.app/profiles' });
  };

  const openAnalyses = () => {
    browser.tabs.create({ url: 'https://homematch-web.vercel.app/analyses' });
  };

  // -- Loading state --
  if (isLoading) {
    return (
      <div className="min-w-[320px] max-w-[380px] p-4 flex items-center justify-center h-[200px]">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  // -- Not authenticated: show login form --
  if (!session?.user) {
    return (
      <div className="min-w-[320px] max-w-[380px] p-4 space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-lg font-bold text-primary">HomeMatch</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to get AI-powered match scores on Flatfox
          </p>
        </div>

        <LoginForm onSuccess={fetchSession} />

        <p className="text-xs text-center text-muted-foreground">
          No account?{' '}
          <button
            type="button"
            onClick={() =>
              browser.tabs.create({
                url: 'https://homematch-web.vercel.app',
              })
            }
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Sign up on our website
          </button>
        </p>
      </div>
    );
  }

  // -- Authenticated: show dashboard --
  return (
    <div className="min-w-[320px] max-w-[380px] p-4 space-y-3">
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-primary">HomeMatch</h1>
        <ConnectionStatus isConnected={isConnected} />
      </div>

      {/* Profile switcher */}
      <ProfileSection
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSwitch={handleProfileSwitch}
        isLoading={profilesLoading}
      />

      {/* Signed-in email */}
      <p className="text-xs text-muted-foreground">
        Signed in as {session.user.email}
      </p>

      <Separator />

      {/* Actions */}
      <div className="space-y-2">
        <Button
          variant="outline"
          onClick={openPreferences}
          className="w-full rounded-xl text-sm justify-start"
        >
          <Settings className="h-4 w-4 mr-2" />
          Edit Preferences
        </Button>

        <Button
          variant="outline"
          onClick={openAnalyses}
          className="w-full rounded-xl text-sm justify-start"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          View Analyses
        </Button>
      </div>

      <Separator />

      <Button
        variant="ghost"
        onClick={handleSignOut}
        className="w-full text-sm text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
