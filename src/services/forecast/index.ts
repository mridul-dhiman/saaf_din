export * from './types';
export * from './openMeteoProvider';

import { openMeteoProvider } from './openMeteoProvider';
import { ForecastProvider } from './types';

// Default provider as specified in HANDOFF.md
export const currentForecastProvider: ForecastProvider = openMeteoProvider;
