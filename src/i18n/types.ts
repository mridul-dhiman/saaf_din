export interface TranslationDictionary {
  appName: string;
  appSubtitle: string;
  nav: {
    today: string;
    swaps: string;
    simulator: string;
    roomScan: string;
    assistant: string;
    profile: string;
    howCalculated: string;
  };
  banner: {
    usAqi: string;
    forecastSource: string;
    airSummary: string;
    pm25Conc: string;
    pm10Coarse: string;
    ambientTemp: string;
    relHumidity: string;
    surfaceWind: string;
  };
  today: {
    title: string;
    actionsDone: string;
    todaysImpact: string;
    howCalculated: string;
    pm25Avoided: string;
    co2Saved: string;
    cigsAvoided: string;
    family: string;
    consultAssistant: string;
    next24Hours: string;
    worstWindow: string;
    bestWindow: string;
    shareCard: string;
  };
  disclaimer: string;
}
