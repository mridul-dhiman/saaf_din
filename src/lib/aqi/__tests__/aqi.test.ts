import { describe, it, expect } from 'vitest';
import { findBestAndWorstWindows, ForecastHour } from '../windows';
import { getAqiBand } from '../banding';

describe('AQI & Ventilation Windows Tests (IMPACT_MODEL.md Section 5 & 7)', () => {
  // Test 8: Best-window detection on a hand-written 24-hour series
  it('8. Best-window detection on a hand-written 24-hour series', () => {
    // 24 hours series:
    // Hours 06 to 12 have high pollution (200 µg/m³)
    // Hours 13 and 14 have clean air (40 µg/m³ and 50 µg/m³ -> mean 45 µg/m³)
    // Hours 15 to 22 have high pollution (180 µg/m³)
    const series: ForecastHour[] = [];
    for (let h = 0; h < 24; h++) {
      let pm = 190;
      if (h === 13) pm = 40;
      else if (h === 14) pm = 50;
      else if (h === 8 || h === 9) pm = 320; // worst window peak

      series.push({
        hour: h,
        pm2_5: pm,
      });
    }

    const result = findBestAndWorstWindows(series);

    // Best window should be 13:00 to 15:00
    expect(result.bestWindow).not.toBeNull();
    expect(result.bestWindow?.startHour).toBe(13);
    expect(result.bestWindow?.endHour).toBe(15);
    expect(result.bestWindow?.startTime).toBe('13:00');
    expect(result.bestWindow?.endTime).toBe('15:00');
    expect(result.bestWindow?.meanPm25).toBe(45);
    expect(result.canVentilateToday).toBe(true);

    // Worst window should be 08:00 to 10:00 (peak 320)
    expect(result.worstWindow).not.toBeNull();
    expect(result.worstWindow?.startHour).toBe(8);
    expect(result.worstWindow?.endHour).toBe(10);
    expect(result.worstWindow?.meanPm25).toBe(320);
  });

  it('advises against ventilation when best window exceeds threshold (150 µg/m³)', () => {
    const severeSeries: ForecastHour[] = [];
    for (let h = 0; h < 24; h++) {
      severeSeries.push({
        hour: h,
        pm2_5: 220, // All day severe pollution
      });
    }

    const result = findBestAndWorstWindows(severeSeries);
    expect(result.canVentilateToday).toBe(false);
    expect(result.bestWindow?.isVentilationRecommended).toBe(false);
    expect(result.advisory).toContain('Air quality remains severe throughout the day');
  });

  it('correctly maps US AQI values to official bands', () => {
    expect(getAqiBand(42).category).toBe('Good');
    expect(getAqiBand(85).category).toBe('Moderate');
    expect(getAqiBand(130).category).toBe('Unhealthy for Sensitive Groups');
    expect(getAqiBand(175).category).toBe('Unhealthy');
    expect(getAqiBand(248).category).toBe('Very Unhealthy');
    expect(getAqiBand(350).category).toBe('Hazardous');
    expect(getAqiBand(null).shortLabel).toBe('Unknown');
  });

  it('window search over a series with null hours never picks them', () => {
    // 24 hours: hours 13 and 14 have null PM2.5
    // Hours 16 and 17 have clean PM2.5 (80 and 90 -> mean 85)
    // Other hours are 250
    const series: ForecastHour[] = [];
    for (let h = 0; h < 24; h++) {
      let pm: number | null = 250;
      if (h === 13 || h === 14) pm = null; // Missing hours
      else if (h === 16) pm = 80;
      else if (h === 17) pm = 90;

      series.push({
        hour: h,
        pm2_5: pm,
      });
    }

    const result = findBestAndWorstWindows(series);
    // Must NOT pick hours 13-14 (would be mean 0 if null converted to 0)
    expect(result.bestWindow).not.toBeNull();
    expect(result.bestWindow?.startHour).toBe(16);
    expect(result.bestWindow?.endHour).toBe(18);
    expect(result.bestWindow?.meanPm25).toBe(85);
  });

  it('returns null windows when no complete contiguous 2-hour window exists', () => {
    // Every daytime hour alternates with null, so no contiguous 2 hours exist
    const series: ForecastHour[] = [];
    for (let h = 0; h < 24; h++) {
      series.push({
        hour: h,
        pm2_5: h % 2 === 0 ? 100 : null,
      });
    }

    const result = findBestAndWorstWindows(series);
    expect(result.bestWindow).toBeNull();
    expect(result.worstWindow).toBeNull();
    expect(result.canVentilateToday).toBe(false);
    expect(result.advisory).toBe('');
  });

  // Phase 4: No 3-hour cap on window search
  it('Phase 4: finds contiguous clean window of length > 3 hours without cap (e.g. 4-hour window)', () => {
    // Hours 12, 13, 14, 15 have 40 µg/m³; all other hours are 250 µg/m³
    const series: ForecastHour[] = [];
    for (let h = 0; h < 24; h++) {
      series.push({
        hour: h,
        pm2_5: h >= 12 && h < 16 ? 40 : 250,
      });
    }

    const result = findBestAndWorstWindows(series);
    expect(result.bestWindow).not.toBeNull();
    expect(result.bestWindow?.startHour).toBe(12);
    expect(result.bestWindow?.endHour).toBe(16);
    expect(result.bestWindow?.durationHours).toBe(4);
    expect(result.bestWindow?.meanPm25).toBe(40);
  });

  // Phase 4: Window search never crosses 22:00 or across calendar dates
  it('Phase 4: window search never crosses 22:00 and restricts to single calendar date', () => {
    // Series spanning two days: day 1 hours 18..23, day 2 hours 00..10
    const series: ForecastHour[] = [];
    for (let h = 18; h < 24; h++) {
      series.push({
        hour: h,
        time: `2026-11-25T${String(h).padStart(2, '0')}:00`,
        pm2_5: h >= 21 ? 30 : 200, // hours 21, 22, 23 are clean
      });
    }
    for (let h = 0; h < 12; h++) {
      series.push({
        hour: h,
        time: `2026-11-26T${String(h).padStart(2, '0')}:00`,
        pm2_5: 25, // day 2 is clean
      });
    }

    const result = findBestAndWorstWindows(series);
    // Because target calendar date is 2026-11-25, and hours must end at or before 22:00:
    // Only daytime hours on 2026-11-25 with h < 22 are eligible (18, 19, 20, 21)
    if (result.bestWindow) {
      expect(result.bestWindow.endHour).toBeLessThanOrEqual(22);
    }
    // And hours from 2026-11-26 were not mixed into day 1's window
    expect(result.bestWindow?.startHour).toBeGreaterThanOrEqual(18);
  });
});
