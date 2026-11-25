export interface ForecastHour {
  hour: number;          // 0-23
  pm2_5: number | null;  // µg/m³
  time?: string;         // ISO or formatted
  us_aqi?: number | null;
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

/**
 * Finds the best (lowest PM2.5) and worst (highest PM2.5) contiguous ventilation windows
 * of at least 2 hours between 06:00 and 22:00 local time within one calendar date.
 * No 3-hour cap: allows any contiguous daytime run of length >= 2 hours.
 */
export function findBestAndWorstWindows(
  hours: ForecastHour[],
  minHour: number = 6,
  maxHour: number = 22
): DayWindowsResult {
  if (hours.length === 0) {
    return {
      bestWindow: null,
      worstWindow: null,
      canVentilateToday: false,
      advisory: 'No forecast data available to determine windows.',
    };
  }

  // Determine target calendar date from the first forecast point
  const firstPoint = hours[0];
  const targetDate = firstPoint.time ? firstPoint.time.slice(0, 10) : null;

  // Filter to eligible waking hours on the same calendar date
  // A window ending at or before maxHour (22:00) means the start hour of the last block must be <= maxHour - 1 (21:00)
  const daytimeHours = hours.filter((h) => {
    if (targetDate && h.time && h.time.slice(0, 10) !== targetDate) {
      return false;
    }
    return h.hour >= minHour && h.hour < maxHour;
  });

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

  // Search contiguous runs of length >= MIN_WINDOW_HOURS with no upper cap
  for (let len = MIN_WINDOW_HOURS; len <= daytimeHours.length; len++) {
    for (let i = 0; i <= daytimeHours.length - len; i++) {
      const slice = daytimeHours.slice(i, i + len);

      // Verify hours are contiguous and no hour has null/NaN PM2.5
      let isContiguous = true;
      let hasNullPm = false;
      for (let j = 0; j < slice.length; j++) {
        if (slice[j].pm2_5 === null || slice[j].pm2_5 === undefined || isNaN(slice[j].pm2_5 as number)) {
          hasNullPm = true;
          break;
        }
        if (j > 0 && slice[j].hour !== slice[j - 1].hour + 1) {
          isContiguous = false;
          break;
        }
      }
      if (!isContiguous || hasNullPm) continue;

      const endHour = slice[slice.length - 1].hour + 1;
      // Guarantee window ends at or before maxHour
      if (endHour > maxHour) continue;

      const sumPm = slice.reduce((acc, h) => acc + (h.pm2_5 as number), 0);
      const mean = sumPm / len;

      if (mean < bestMean || (mean === bestMean && bestCandidate && len > bestCandidate.duration)) {
        bestMean = mean;
        bestCandidate = {
          startHour: slice[0].hour,
          endHour,
          mean: Math.round(mean),
          duration: len,
        };
      }

      if (mean > worstMean || (mean === worstMean && worstCandidate && len > worstCandidate.duration)) {
        worstMean = mean;
        worstCandidate = {
          startHour: slice[0].hour,
          endHour,
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
  if (bestWindow && !canVentilate) {
    advisory = `Air quality remains severe throughout the day (lowest average is ${bestWindow.meanPm25} µg/m³). Keep windows closed and rely on indoor air cleaning.`;
  } else if (bestWindow && canVentilate) {
    advisory = `Best ventilation window is between ${bestWindow.startTime} and ${bestWindow.endTime} (avg PM2.5: ${bestWindow.meanPm25} µg/m³).`;
  }

  return {
    bestWindow,
    worstWindow,
    canVentilateToday: canVentilate,
    advisory,
  };
}
