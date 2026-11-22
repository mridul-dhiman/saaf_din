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
  });
});
