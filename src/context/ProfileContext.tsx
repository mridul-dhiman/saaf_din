import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile } from '../types';
import { DEMO_PROFILE } from '../types/demoProfile';

interface ProfileContextType {
  profile: Profile;
  setProfile: (p: Profile) => void;
  resetToDemo: () => void;
  isDemo: boolean;
}

const STORAGE_KEY = 'saafdin_profile';

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<Profile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load profile from localStorage:', e);
    }
    return DEMO_PROFILE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to save profile to localStorage:', e);
    }
  }, [profile]);

  const setProfile = (newProfile: Profile) => {
    setProfileState(newProfile);
  };

  const resetToDemo = () => {
    setProfileState(DEMO_PROFILE);
  };

  const isDemo = profile.location.name === DEMO_PROFILE.location.name;

  return (
    <ProfileContext.Provider value={{ profile, setProfile, resetToDemo, isDemo }}>
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
