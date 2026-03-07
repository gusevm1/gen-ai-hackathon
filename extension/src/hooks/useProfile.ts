import { useState, useEffect, useCallback } from 'react';
import { profileStorage } from '../storage/profile-storage';
import { PreferenceProfileSchema } from '../schema/profile';
import type { PreferenceProfile } from '../schema/profile';

export interface UseProfileReturn {
  profile: PreferenceProfile | null;
  isLoading: boolean;
  hasProfile: boolean;
  saveProfile: (profile: PreferenceProfile) => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<PreferenceProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const saved = await profileStorage.getValue();
        if (saved) {
          setProfile(saved);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const saveProfile = useCallback(async (newProfile: PreferenceProfile) => {
    // Validate with Zod schema before saving
    const validated = PreferenceProfileSchema.parse(newProfile);
    await profileStorage.setValue(validated);
    setProfile(validated);
  }, []);

  return {
    profile,
    isLoading,
    hasProfile: profile !== null,
    saveProfile,
  };
}
