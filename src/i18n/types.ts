export interface TranslationDictionary {
  appName: string;
  appSubtitle: string;
  disclaimer: string;
  common: {
    save: string;
    back: string;
    continue: string;
    cancel: string;
    close: string;
    retry: string;
    loading: string;
    tryDemo: string;
    actionsDone: string;
  };
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
  swaps: {
    title: string;
    subtitle: string;
    allSwaps: string;
    commute: string;
    cooking: string;
    puja: string;
    fitness: string;
    highImpact: string;
    weeklyImpact: string;
    adopt: string;
    adopted: string;
    baselineHabit: string;
    cleanAlternative: string;
    exposureAvoided: string;
    co2Saved: string;
    actionBenefit: string;
  };
  simulator: {
    title: string;
    subtitle: string;
    selectMember: string;
    baselineScenario: string;
    alternativeScenario: string;
    simulatedReduction: string;
    inhaledDose: string;
    environment: string;
    mask: string;
    activity: string;
    duration: string;
  };
  roomScan: {
    title: string;
    subtitle: string;
    captureOrUpload: string;
    takePhoto: string;
    uploadImage: string;
    sampleDemoScan: string;
    analysing: string;
    findings: string;
    immediateActions: string;
    disclaimer: string;
  };
  assistant: {
    title: string;
    subtitle: string;
    placeholder: string;
    send: string;
    suggestedQuestions: string;
    disclaimer: string;
  };
  onboarding: {
    title: string;
    subtitle: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    searchPlaceholder: string;
    gpsButton: string;
    popularCities: string;
    addMember: string;
    saveAndPlan: string;
  };
  receipt: {
    title: string;
    breakdown: string;
    duration: string;
    hourlyForecast: string;
    baseline: string;
    alternative: string;
    inhaled: string;
    avoided: string;
  };
  shareCard: {
    title: string;
    shareImpact: string;
    copyLink: string;
    copied: string;
    downloadCard: string;
  };
  howCalculated: {
    title: string;
    subtitle: string;
    constantCol: string;
    valueCol: string;
    unitCol: string;
    sourceCol: string;
    statusCol: string;
    confirmedInSource: string;
    assumption: string;
  };
}
