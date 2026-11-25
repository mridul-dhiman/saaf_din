import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile } from '../types';
import { DEMO_PROFILE } from '../types/demoProfile';
import {
  initAnonymousAuth,
  loadProfileFromFirestore,
  saveProfileToFirestore,
} from '../services/firebase';

interface ProfileContextType {
  profile: Profile;
  hasProfile: boolean;
  isLoading: boolean;
  isDemo: boolean;
  setProfile: (p: Profile, isDemo?: boolean) => void;
  loadDemoProfile: () => void;
  resetToDemo: () => void;
}

const STORAGE_KEY = 'saafdin_profile';
const IS_DEMO_KEY = 'saafdin_is_demo';

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check local storage immediately on initial render
  const [profileState, setProfileState] = useState<Profile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse local profile:', e);
    }
    return null;
  });

  const [isDemo, setIsDemo] = useState<boolean>(() => {
    try {
      return localStorage.getItem(IS_DEMO_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function initAuthAndProfile() {
      // 1. Initialize anonymous authentication on startup
      await initAnonymousAuth();

      // 2. If no local profile found, attempt to load from Firestore
      if (!profileState) {
        try {
          const remoteProfile = await loadProfileFromFirestore();
          if (isMounted && remoteProfile) {
            setProfileState(remoteProfile);
            setIsDemo(false);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteProfile));
            localStorage.setItem(IS_DEMO_KEY, 'false');
          }
        } catch (err) {
          console.warn('Error loading remote profile:', err);
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    initAuthAndProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const setProfile = (newProfile: Profile, markAsDemo = false) => {
    setProfileState(newProfile);
    setIsDemo(markAsDemo);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
      localStorage.setItem(IS_DEMO_KEY, markAsDemo ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to save profile to localStorage:', e);
    }
    saveProfileToFirestore(newProfile);
  };

  const loadDemoProfile = () => {
    setProfile(DEMO_PROFILE, true);
  };

  const resetToDemo = () => {
    loadDemoProfile();
  };

  // While loading on startup, render a minimal clean loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <span className="font-label-md text-label-md text-on-surface-variant font-semibold mt-3">
          Loading SaafDin…
        </span>
      </div>
    );
  }

  // If no profile exists yet, fallback to DEMO_PROFILE for type-safety while hasProfile is false
  const activeProfile = profileState || DEMO_PROFILE;
  const hasProfile = profileState !== null;

  return (
    <ProfileContext.Provider
      value={{
        profile: activeProfile,
        hasProfile,
        isLoading,
        isDemo,
        setProfile,
        loadDemoProfile,
        resetToDemo,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export function useProfile(): ProfileContextType {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return ctx;
}
