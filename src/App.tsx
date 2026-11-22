import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { ProfileProvider } from './context/ProfileContext';

export const App: React.FC = () => {
  return (
    <ProfileProvider>
      <RouterProvider router={router} />
    </ProfileProvider>
  );
};

export default App;
