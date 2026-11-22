import React, { createContext, useContext, useState, useEffect } from 'react';
import { TranslationDictionary } from './types';
import { en } from './en';
import { hi } from './hi';
import { useProfile } from '../context/ProfileContext';

interface LanguageContextType {
  language: 'en' | 'hi';
  setLanguage: (lang: 'en' | 'hi') => void;
  t: TranslationDictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, setProfile } = useProfile();
  const [lang, setLangState] = useState<'en' | 'hi'>(() => {
    return profile.language || 'en';
  });

  const setLanguage = (newLang: 'en' | 'hi') => {
    setLangState(newLang);
    setProfile({
      ...profile,
      language: newLang,
    });
    try {
      localStorage.setItem('saafdin_lang', newLang);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    if (profile.language && profile.language !== lang) {
      setLangState(profile.language);
    }
  }, [profile.language]);

  const t = lang === 'hi' ? hi : en;

  return (
    <LanguageContext.Provider value={{ language: lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
