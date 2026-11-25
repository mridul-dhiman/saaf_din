export interface ForecastHour {
  hour: number;          // 0-23
  pm2_5: number | null;  // µg/m³
  time?: string;         // ISO or formatted, e.g. "2026-11-25T08:00"
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
  isTomorrow?: boolean;
  dateLabel?: string;
  label?: string; // e.g. "Tomorrow 07:00–10:00" or "13:00–15:00"
}

export interface DayWindowsResult {
  bestWindow: AqiWindow | null;
  worstWindow: AqiWindow | null;
  canVentilateToday: boolean;
  advisory: string;
}

const VENTILATION_THRESHOLD_UG = 150; // Above 150 µg/m³, no good ventilation window exists
const MIN_WINDOW_HOURS = 2;

interface WindowCandidate {
  startHour: number;
  endHour: number;
  mean: number;
  duration: number;
  date: string | null;
  isTomorrow: boolean;
}

/**
 * Finds the best (lowest PM2.5) and worst (highest PM2.5) contiguous ventilation windows
 * of at least 2 hours between 06:00 and 22:00 local time within the next 24 hours of forecast.
 * Evaluates 06:00–22:00 on each calendar date the 24 hours cover, takes the best and worst
 * across them, and labels the date when it is tomorrow ("Tomorrow 07:00–10:00").
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

  // Evaluate the next 24 hours of forecast
  const next24 = hours.slice(0, 24);
  const firstPoint = next24[0];
  const startDate = firstPoint.time ? firstPoint.time.slice(0, 10) : null;

  // Group forecast hours by calendar date (or 'single_date' if timestamps not provided)
  const dateBuckets = new Map<string, ForecastHour[]>();
  for (const h of next24) {
    const d = h.time ? h.time.slice(0, 10) : 'single_date';
    if (!dateBuckets.has(d)) {
      dateBuckets.set(d, []);
    }
    dateBuckets.get(d)!.push(h);
  }

  let bestMean = Infinity;
  let bestCandidate: WindowCandidate | null = null;

  let worstMean = -Infinity;
  let worstCandidate: WindowCandidate | null = null;

  // Search contiguous runs of length >= MIN_WINDOW_HOURS on each calendar date
  for (const [dateStr, dateHours] of dateBuckets.entries()) {
    const isTomorrow = startDate !== null && dateStr !== 'single_date' && dateStr !== startDate;

    // Filter to daytime waking hours on this calendar date
    const daytimeHours = dateHours.filter((h) => h.hour >= minHour && h.hour < maxHour);
    if (daytimeHours.length < MIN_WINDOW_HOURS) {
      continue;
    }

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
        // Guarantee window ends at or before maxHour (22:00)
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
            date: dateStr,
            isTomorrow,
          };
        }

        if (mean > worstMean || (mean === worstMean && worstCandidate && len > worstCandidate.duration)) {
          worstMean = mean;
          worstCandidate = {
            startHour: slice[0].hour,
            endHour,
            mean: Math.round(mean),
            duration: len,
            date: dateStr,
            isTomorrow,
          };
        }
      }
    }
  }

  if (!bestCandidate && !worstCandidate) {
    return {
      bestWindow: null,
      worstWindow: null,
      canVentilateToday: false,
      advisory: '',
    };
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
        isTomorrow: bestCandidate.isTomorrow,
        dateLabel: bestCandidate.isTomorrow ? 'Tomorrow' : undefined,
        label: bestCandidate.isTomorrow
          ? `Tomorrow ${formatTime(bestCandidate.startHour)}–${formatTime(bestCandidate.endHour)}`
          : `${formatTime(bestCandidate.startHour)}–${formatTime(bestCandidate.endHour)}`,
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
        isTomorrow: worstCandidate.isTomorrow,
        dateLabel: worstCandidate.isTomorrow ? 'Tomorrow' : undefined,
        label: worstCandidate.isTomorrow
          ? `Tomorrow ${formatTime(worstCandidate.startHour)}–${formatTime(worstCandidate.endHour)}`
          : `${formatTime(worstCandidate.startHour)}–${formatTime(worstCandidate.endHour)}`,
      }
    : null;

  const canVentilate = bestWindow ? bestWindow.meanPm25 <= VENTILATION_THRESHOLD_UG : false;

  let advisory = '';
  if (bestWindow && !canVentilate) {
    advisory = `Air quality remains severe throughout the day (lowest average is ${bestWindow.meanPm25} µg/m³). Keep windows closed and rely on indoor air cleaning.`;
  } else if (bestWindow && canVentilate) {
    const timePrefix = bestWindow.isTomorrow ? 'Tomorrow ' : '';
    advisory = `Best ventilation window is between ${timePrefix}${bestWindow.startTime} and ${bestWindow.endTime} (avg PM2.5: ${bestWindow.meanPm25} µg/m³).`;
  }

  return {
    bestWindow,
    worstWindow,
    canVentilateToday: canVentilate,
    advisory,
  };
}
