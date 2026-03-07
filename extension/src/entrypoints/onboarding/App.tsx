import { WizardShell } from '@/components/wizard/WizardShell';
import { useProfile } from '@/hooks/useProfile';

export default function App() {
  const { hasProfile, isLoading } = useProfile();

  // Check URL params for ?edit=true to support popup's "Edit Preferences" link
  const searchParams = new URLSearchParams(window.location.search);
  const isEditFromUrl = searchParams.get('edit') === 'true';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <WizardShell isEditMode={isEditFromUrl || hasProfile} />;
}
