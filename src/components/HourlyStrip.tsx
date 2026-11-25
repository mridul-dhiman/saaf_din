import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import { HourlyForecastPoint } from '../types';
import { DayWindowsResult, getAqiBand } from '../lib/aqi';

interface HourlyStripProps {
  points: HourlyForecastPoint[];
  windows: DayWindowsResult;
}

export const HourlyStrip: React.FC<HourlyStripProps> = ({ points, windows }) => {
  const { t } = useLanguage();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Maximum PM2.5 in the dataset to scale bar heights smoothly (min max is at least 150)
  const validPm25s = points.map((p) => p.pm2_5).filter((v): v is number => v !== null);
  const maxPm25 = Math.max(150, ...(validPm25s.length > 0 ? validPm25s : [150]));

  const formatHourLabel = (h: number) => {
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h > 12 ? `${h - 12} PM` : `${h} AM`;
  };

  const isInBestWindow = (h: number) => {
    if (!windows.bestWindow) return false;
    const { startHour, endHour } = windows.bestWindow;
    if (endHour > startHour) {
      return h >= startHour && h < endHour;
    }
    // Overnight wrap
    return h >= startHour || h < endHour;
  };

  const isInWorstWindow = (h: number) => {
    if (!windows.worstWindow) return false;
    const { startHour, endHour } = windows.worstWindow;
    if (endHour > startHour) {
      return h >= startHour && h < endHour;
    }
    return h >= startHour || h < endHour;
  };

  return (
    <div className="w-full bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-md">
      {/* Header and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            {t.today.next24Hours}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t.today.hourlyStripSubtitle}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-space-sm font-label-sm text-label-sm text-on-surface-variant flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            0–50 Good
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            51–100 Moderate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            101–150 Sensitive
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            151–200 Unhealthy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            201+ Severe
          </span>
        </div>
      </div>

      {/* Actionable Window Callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
        {/* Worst Window Callout */}
        {windows.worstWindow && (
          <div className="flex items-center gap-space-sm bg-error-container/30 border border-error-container p-3 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-error-container text-error flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">block</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-error font-bold uppercase tracking-wider">
                {t.today.worstWindow}: {windows.worstWindow.startTime} – {windows.worstWindow.endTime}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface">
                Average ~{windows.worstWindow.meanPm25} µg/m³ · Keep windows tightly sealed
              </span>
            </div>
          </div>
        )}

        {/* Best Window Callout */}
        {windows.bestWindow && (
          <div
            className={`flex items-center gap-space-sm p-3 rounded-xl border ${
              windows.canVentilateToday
                ? 'bg-secondary-container/20 border-secondary/30'
                : 'bg-surface-container-low border-surface-container'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                windows.canVentilateToday
                  ? 'bg-secondary text-on-secondary'
                  : 'bg-surface-container text-outline'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {windows.canVentilateToday ? 'air' : 'lock'}
              </span>
            </div>
            <div className="flex flex-col">
              <span
                className={`font-label-sm text-label-sm font-bold uppercase tracking-wider ${
                  windows.canVentilateToday ? 'text-secondary' : 'text-on-surface-variant'
                }`}
              >
                {windows.canVentilateToday
                  ? `${t.today.bestWindow}: ${windows.bestWindow.label || `${windows.bestWindow.startTime} – ${windows.bestWindow.endTime}`}`
                  : 'No Safe Ventilation Window Today'}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface">
                {windows.canVentilateToday
                  ? `Average ~${windows.bestWindow.meanPm25} µg/m³`
                  : `Lowest average is ${windows.bestWindow.meanPm25} µg/m³ (> 150 µg/m³ threshold)`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 24-Bar Visual Hourly Chart */}
      <div className="mt-2 flex flex-col">
        {/* Tooltip info banner on hover */}
        <div className="h-6 flex items-center justify-end text-label-sm text-on-surface-variant mb-1">
          {hoveredIdx !== null && points[hoveredIdx] ? (
            <span className="font-semibold text-on-surface bg-surface-container px-2 py-0.5 rounded-md">
              {formatHourLabel(points[hoveredIdx].hour)}:{' '}
              {points[hoveredIdx].pm2_5 !== null
                ? `${points[hoveredIdx].pm2_5} µg/m³ PM2.5`
                : 'No PM2.5 data'}{' '}
              ·{' '}
              {points[hoveredIdx].us_aqi !== null
                ? `US AQI ${points[hoveredIdx].us_aqi}`
                : 'No AQI data'}
            </span>
          ) : (
            <span className="text-[11px] text-outline">{t.today.hourlyStripHint}</span>
          )}
        </div>

        {/* Scrollable Container on Mobile, Grid on Desktop */}
        <div className="w-full overflow-x-auto no-scrollbar pb-2">
          <div className="min-w-[700px] flex items-end justify-between gap-1.5 h-36 pt-4 px-1">
            {points.slice(0, 24).map((p, idx) => {
              const isBest = isInBestWindow(p.hour);
              const isWorst = isInWorstWindow(p.hour);
              const isNull = p.pm2_5 === null;
              const barHeightPercent = isNull
                ? 6
                : Math.max(12, Math.round(((p.pm2_5 as number) / maxPm25) * 100));
              const aqiBand = getAqiBand(p.us_aqi);
              const colorClass = isNull || p.us_aqi === null
                ? 'bg-surface-container-high border border-dashed border-outline/40'
                : aqiBand.bgClass;

              return (
                <div
                  key={`${p.time}-${idx}`}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Window badge indicator above bar */}
                  <div className="h-4 flex items-center justify-center mb-1">
                    {isBest && (
                      <span className="w-2 h-2 rounded-full bg-secondary ring-2 ring-secondary/30" title="Best window" />
                    )}
                    {isWorst && (
                      <span className="w-2 h-2 rounded-full bg-error ring-2 ring-error/30" title="Worst window" />
                    )}
                  </div>

                  {/* Vertical bar */}
                  <div className="w-full flex justify-center items-end h-24">
                    <div
                      className={`w-full max-w-[20px] rounded-t-sm transition-all duration-200 ${colorClass} ${
                        hoveredIdx === idx ? 'brightness-110 scale-y-105' : 'opacity-90'
                      } ${isBest ? 'ring-2 ring-secondary' : isWorst ? 'ring-2 ring-error' : ''}`}
                      style={{ height: `${barHeightPercent}%` }}
                    />
                  </div>

                  {/* Hour text label */}
                  <div className="mt-2 text-center">
                    <span
                      className={`font-label-sm text-[10px] block transition-colors ${
                        hoveredIdx === idx
                          ? 'text-primary font-bold'
                          : isBest
                          ? 'text-secondary font-bold'
                          : isWorst
                          ? 'text-error font-bold'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      {formatHourLabel(p.hour)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
