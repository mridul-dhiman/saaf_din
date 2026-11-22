import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { ProfileProvider } from './context/ProfileContext';
import { LanguageProvider } from './i18n';
import { initAnonymousAuth } from './services/firebase';

export const App: React.FC = () => {
  useEffect(() => {
    // Automatically sign in anonymously on first load
    initAnonymousAuth().catch((err) => {
      console.warn('Anonymous auth init error:', err);
    });
  }, []);

  return (
    <ProfileProvider>
      <LanguageProvider>
        <RouterProvider router={router} />
      </LanguageProvider>
    </ProfileProvider>
  );
};

export default App;
