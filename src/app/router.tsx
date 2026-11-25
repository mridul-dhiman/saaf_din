import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Shell } from './Shell';
import { TodayPage } from '../features/today/TodayPage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { SwapsPage } from '../features/swaps/SwapsPage';
import { SimulatorPage } from '../features/simulator/SimulatorPage';
import { RoomScanPage } from '../features/room-scan/RoomScanPage';
import { AssistantPage } from '../features/assistant/AssistantPage';
import { HowWeCalculatePage } from '../features/how-we-calculate/HowWeCalculatePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      {
        index: true,
        element: <Navigate to="/today" replace />,
      },
      {
        path: 'today',
        element: <TodayPage />,
      },
      {
        path: 'onboarding',
        element: <OnboardingPage />,
      },
      {
        path: 'swaps',
        element: <SwapsPage />,
      },
      {
        path: 'simulator',
        element: <SimulatorPage />,
      },
      {
        path: 'room-scan',
        element: <RoomScanPage />,
      },
      {
        path: 'assistant',
        element: <AssistantPage />,
      },
      {
        path: 'how-we-calculate',
        element: <HowWeCalculatePage />,
      },
      {
        path: '*',
        element: <Navigate to="/today" replace />,
      },
    ],
  },
]);
