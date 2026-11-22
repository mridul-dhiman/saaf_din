export interface ForecastHour {
  hour: number;      // 0-23
  pm2_5: number;     // µg/m³
  time?: string;     // ISO or formatted
  us_aqi?: number;
}

export interface AqiWindow {
  startHour: number;
  endHour: number;   // e.g. 15 for 13:00 to 15:00
  startTime: string; // "13:00"
  endTime: string;   // "15:00"
  durationHours: number;
  meanPm25: number;
  isVentilationRecommended: boolean;
}

export interface DayWindowsResult {
  bestWindow: AqiWindow | null;
  worstWindow: AqiWindow | null;
  canVentilateToday: boolean;
  advisory: string;
}

const VENTILATION_THRESHOLD_UG = 150; // Above 150 µg/m³, no good ventilation window exists
const MIN_WINDOW_HOURS = 2;
const MAX_WINDOW_HOURS = 3;

/**
 * Finds the best (lowest PM2.5) and worst (highest PM2.5) contiguous ventilation windows
 * of at least 2 hours between 06:00 and 22:00 local time.
 */
export function findBestAndWorstWindows(
  hours: ForecastHour[],
  minHour: number = 6,
  maxHour: number = 22
): DayWindowsResult {
  // Filter to eligible waking hours between minHour and maxHour
  const daytimeHours = hours.filter((h) => h.hour >= minHour && h.hour <= maxHour);

  if (daytimeHours.length < MIN_WINDOW_HOURS) {
    return {
      bestWindow: null,
      worstWindow: null,
      canVentilateToday: false,
      advisory: 'Insufficient daytime forecast data available to determine windows.',
    };
  }

  let bestMean = Infinity;
  let bestCandidate: { startHour: number; endHour: number; mean: number; duration: number } | null = null;

  let worstMean = -Infinity;
  let worstCandidate: { startHour: number; endHour: number; mean: number; duration: number } | null = null;

  // Search contiguous runs of length between MIN_WINDOW_HOURS and MAX_WINDOW_HOURS
  for (let len = MIN_WINDOW_HOURS; len <= Math.min(MAX_WINDOW_HOURS, daytimeHours.length); len++) {
    for (let i = 0; i <= daytimeHours.length - len; i++) {
      const slice = daytimeHours.slice(i, i + len);

      // Verify hours are contiguous
      let isContiguous = true;
      for (let j = 1; j < slice.length; j++) {
        if (slice[j].hour !== slice[j - 1].hour + 1) {
          isContiguous = false;
          break;
        }
      }
      if (!isContiguous) continue;

      const sumPm = slice.reduce((acc, h) => acc + h.pm2_5, 0);
      const mean = sumPm / len;

      if (mean < bestMean) {
        bestMean = mean;
        bestCandidate = {
          startHour: slice[0].hour,
          endHour: slice[slice.length - 1].hour + 1,
          mean: Math.round(mean),
          duration: len,
        };
      }

      if (mean > worstMean) {
        worstMean = mean;
        worstCandidate = {
          startHour: slice[0].hour,
          endHour: slice[slice.length - 1].hour + 1,
          mean: Math.round(mean),
          duration: len,
        };
      }
    }
  }

  const formatTime = (h: number) => `${String(h).padStart(2, '0')}:00`;

  const bestWindow: AqiWindow | null = bestCandidate
    ? {
        startHour: bestCandidate.startHour,
        endHour: bestCandidate.endHour,
        startTime: formatTime(bestCandidate.startHour),
        endTime: formatTime(bestCandidate.endHour),
        durationHours: bestCandidate.duration,
        meanPm25: bestCandidate.mean,
        isVentilationRecommended: bestCandidate.mean <= VENTILATION_THRESHOLD_UG,
      }
    : null;

  const worstWindow: AqiWindow | null = worstCandidate
    ? {
        startHour: worstCandidate.startHour,
        endHour: worstCandidate.endHour,
        startTime: formatTime(worstCandidate.startHour),
        endTime: formatTime(worstCandidate.endHour),
        durationHours: worstCandidate.duration,
        meanPm25: worstCandidate.mean,
        isVentilationRecommended: false,
      }
    : null;

  const canVentilate = bestWindow ? bestWindow.meanPm25 <= VENTILATION_THRESHOLD_UG : false;

  let advisory = '';
  if (!canVentilate) {
    advisory = `Air quality remains severe throughout the day (lowest average is ${bestWindow?.meanPm25 ?? 'high'} µg/m³). Keep windows closed and rely on indoor air cleaning.`;
  } else if (bestWindow) {
    advisory = `Best ventilation window is between ${bestWindow.startTime} and ${bestWindow.endTime} (avg PM2.5: ${bestWindow.meanPm25} µg/m³).`;
  }

  return {
    bestWindow,
    worstWindow,
    canVentilateToday: canVentilate,
    advisory,
  };
}
