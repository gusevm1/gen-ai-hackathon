import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Settings, BarChart3, LogOut } from 'lucide-react';
import LoginForm from '@/components/popup/LoginForm';

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

  useEffect(() => {
    fetchSession();
  }, []);

  const handleSignOut = async () => {
    await browser.runtime.sendMessage({ action: 'signOut' });
    setSession(null);
  };

  const openPreferences = () => {
    browser.tabs.create({ url: 'https://homematch-web.vercel.app/dashboard' });
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-primary">HomeMatch</h1>
      </div>

      {/* User info */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium text-foreground truncate">
            {session.user.email}
          </p>
        </CardContent>
      </Card>

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
