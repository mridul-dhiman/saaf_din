import React from 'react';
import { HourlyForecastPoint } from '../types';
import { getAqiBand } from '../lib/aqi';

interface AqiBannerProps {
  currentPoint: HourlyForecastPoint;
  source: string;
  updatedAt: string;
  advisoryText?: string;
}

export const AqiBanner: React.FC<AqiBannerProps> = ({
  currentPoint,
  source,
  updatedAt,
  advisoryText,
}) => {
  const hasAqi = currentPoint.us_aqi !== null && currentPoint.us_aqi !== undefined;
  const band = getAqiBand(currentPoint.us_aqi);

  // Derive simple summary text if not explicitly provided
  const summary =
    advisoryText ||
    (hasAqi && (currentPoint.us_aqi as number) > 200
      ? 'Stagnant morning conditions trapping particulate matter. Keep non-essential ventilation closed until afternoon.'
      : hasAqi && (currentPoint.us_aqi as number) > 100
      ? 'Moderate to sensitive atmospheric dispersion. Sensitive household members should limit intense outdoor exertion.'
      : hasAqi
      ? 'Clean air conditions across the area. Good window for room ventilation.'
      : 'Current atmospheric conditions across the area.');

  return (
    <div className="w-full bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-md relative overflow-hidden">
      {/* Ambient background glow matching AQI severity */}
      {hasAqi && (
        <div
          className={`pointer-events-none absolute -top-12 -right-12 w-64 h-64 rounded-full ${
            (currentPoint.us_aqi as number) > 200
              ? 'bg-error/10'
              : (currentPoint.us_aqi as number) > 100
              ? 'bg-amber-500/10'
              : 'bg-emerald-500/10'
          } blur-3xl`}
        />
      )}

      {/* Top Row: Band status pill, US AQI tag, and source attribution */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm relative z-10">
        <div className="flex items-center gap-space-sm flex-wrap">
          {hasAqi && (
            <>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${band.badgeBgClass} ${band.badgeTextClass} font-label-md text-label-md font-bold uppercase tracking-wider`}
              >
                <span className={`w-2 h-2 rounded-full ${band.bgClass} animate-pulse`}></span>
                {band.shortLabel}
              </span>
              <span className="font-label-md text-label-md px-2.5 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant font-semibold">
                US AQI
              </span>
            </>
          )}
        </div>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {source} · updated {updatedAt}
        </span>
      </div>

      {/* Main Metric Hero Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-center relative z-10">
        {/* Prominent AQI Reading */}
        {hasAqi ? (
          <div className="lg:col-span-5 flex items-baseline gap-3">
            <span className="font-display-lg text-display-lg-mobile lg:text-display-lg text-on-surface font-extrabold tracking-tight leading-none">
              {currentPoint.us_aqi}
            </span>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm font-semibold text-on-surface leading-tight">
                {band.category}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Estimated outdoor exposure index
              </span>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-5 flex items-baseline gap-3">
            <span className="font-body-md text-body-md text-on-surface-variant">
              Air quality reading unavailable
            </span>
          </div>
        )}

        {/* Plain Language Situational Digest */}
        <div className="lg:col-span-7 bg-surface-container-low rounded-xl p-space-md flex items-start gap-space-sm border border-surface-container/60">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[20px]">air</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant font-bold">
              Air Quality Summary
            </span>
            <p className="font-body-md text-body-md text-on-surface leading-snug">
              {summary}
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Telemetry Row: PM2.5, PM10, Temp, Humidity, Wind */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-space-sm pt-space-xs relative z-10">
        {/* PM2.5 Tile */}
        {currentPoint.pm2_5 !== null && currentPoint.pm2_5 !== undefined && (
          <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col justify-between border border-surface-container/40">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              PM2.5 Conc.
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                {currentPoint.pm2_5}
              </span>
              <span className="font-label-sm text-label-sm text-error font-medium">µg/m³</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-error h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, ((currentPoint.pm2_5 as number) / 250) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* PM10 Coarse Tile */}
        {currentPoint.pm10 !== null && currentPoint.pm10 !== undefined && (
          <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col justify-between border border-surface-container/40">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              PM10 Coarse
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                {currentPoint.pm10}
              </span>
              <span className="font-label-sm text-label-sm text-error font-medium">µg/m³</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-error h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, ((currentPoint.pm10 as number) / 400) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Ambient Temperature Tile */}
        {currentPoint.temperature_2m !== null && currentPoint.temperature_2m !== undefined && (
          <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col justify-between border border-surface-container/40">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              Ambient Temp
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                {currentPoint.temperature_2m}°C
              </span>
              <span className="font-label-sm text-label-sm text-secondary font-medium">Surface</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-secondary h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (((currentPoint.temperature_2m as number) + 10) / 50) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Relative Humidity Tile */}
        {currentPoint.relative_humidity_2m !== null && currentPoint.relative_humidity_2m !== undefined && (
          <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col justify-between border border-surface-container/40">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              Rel. Humidity
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                {currentPoint.relative_humidity_2m}%
              </span>
              <span className="font-label-sm text-label-sm text-outline font-medium">Moisture</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-primary-container h-full rounded-full transition-all"
                style={{ width: `${currentPoint.relative_humidity_2m}%` }}
              />
            </div>
          </div>
        )}

        {/* Surface Wind Speed Tile */}
        {currentPoint.wind_speed_10m !== null && currentPoint.wind_speed_10m !== undefined && (
          <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col justify-between border border-surface-container/40 col-span-2 sm:col-span-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              Surface Wind
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                {currentPoint.wind_speed_10m}{' '}
                <span className="text-body-sm font-normal text-on-surface-variant">km/h</span>
              </span>
              <span className="font-label-sm text-label-sm text-outline font-medium">Dispersion</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-outline h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (((currentPoint.wind_speed_10m as number)) / 30) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
