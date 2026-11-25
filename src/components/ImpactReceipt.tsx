import React from 'react';
import { ActionCalculationBreakdown, MemberExposureBreakdown } from '../types';

export interface ImpactReceiptProps {
  breakdown: ActionCalculationBreakdown;
  exposureAvoidedUg: number | null;
  co2SavedKg: number | null;
  cigarettesAvoided?: number | null;
  className?: string;
}

export const ImpactReceipt: React.FC<ImpactReceiptProps> = ({
  breakdown,
  exposureAvoidedUg,
  co2SavedKg,
  cigarettesAvoided,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-3 bg-surface-container-low rounded-xl p-3.5 border border-surface-container/70 text-[12px] ${className}`}>
      <div className="flex items-center justify-between border-b border-surface-container pb-2">
        <span className="font-label-sm text-label-sm text-on-surface font-bold uppercase tracking-wide">
          Calculation Breakdown
        </span>
        <span className="font-label-sm text-[11px] text-on-surface-variant">
          Duration: {breakdown.durationHours} hr
        </span>
      </div>

      {/* Summary figures if provided */}
      {(exposureAvoidedUg !== null || co2SavedKg !== null || (cigarettesAvoided !== undefined && cigarettesAvoided !== null)) && (
        <div className="grid grid-cols-3 gap-2 p-2 bg-surface-container-lowest rounded-lg border border-surface-container text-center">
          <div>
            <div className="text-[10px] text-on-surface-variant font-medium">PM2.5 Avoided</div>
            <div className="text-[13px] font-bold text-primary">
              {exposureAvoidedUg !== null ? `${exposureAvoidedUg} µg` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-on-surface-variant font-medium">CO₂ Saved</div>
            <div className="text-[13px] font-bold text-secondary">
              {co2SavedKg !== null ? `${co2SavedKg} kg` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-on-surface-variant font-medium">Cigarettes</div>
            <div className="text-[13px] font-bold text-on-surface">
              {cigarettesAvoided !== undefined && cigarettesAvoided !== null ? cigarettesAvoided : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Hourly Forecast Concentrations */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-on-surface-variant">
          Hourly Forecast Concentrations (C_outdoor):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {breakdown.hourlyPm25.map((h: { hour: number; pm2_5: number | null }) => (
            <span
              key={h.hour}
              className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface font-mono text-[11px]"
            >
              {String(h.hour).padStart(2, '0')}:00 → {h.pm2_5 !== null ? `${h.pm2_5} µg/m³` : 'no data'}
            </span>
          ))}
        </div>
      </div>

      {/* Parameters Comparison: Baseline vs Alternative */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        {/* Baseline Column */}
        <div className="p-2 rounded-lg bg-surface-container-lowest/80 border border-surface-container/60 flex flex-col gap-1">
          <span className="font-bold text-[11px] text-error">Baseline Parameters</span>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">Environment (F_env):</span>
            <span className="font-semibold text-on-surface">{breakdown.fEnvBase}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">Mask (F_mask):</span>
            <span className="font-semibold text-on-surface">{breakdown.fMaskBase}</span>
          </div>
          {breakdown.ir !== undefined && (
            <div className="flex justify-between text-[11px]">
              <span className="text-outline">Breathing rate (IR):</span>
              <span className="font-semibold text-on-surface">{breakdown.ir} m³/h</span>
            </div>
          )}
          <div className="flex justify-between text-[11px] pt-1 border-t border-surface-container/40">
            <span className="text-outline">Baseline Inhaled:</span>
            <span className="font-bold text-error">
              {breakdown.baselineTotalUg !== null ? `${breakdown.baselineTotalUg} µg` : '—'}
            </span>
          </div>
        </div>

        {/* Alternative Column */}
        <div className="p-2 rounded-lg bg-surface-container-lowest/80 border border-surface-container/60 flex flex-col gap-1">
          <span className="font-bold text-[11px] text-primary">Alternative Parameters</span>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">Environment (F_env):</span>
            <span className="font-semibold text-on-surface">{breakdown.fEnvAlt}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">Mask (F_mask):</span>
            <span className="font-semibold text-on-surface">{breakdown.fMaskAlt}</span>
          </div>
          {breakdown.ir !== undefined && (
            <div className="flex justify-between text-[11px]">
              <span className="text-outline">Breathing rate (IR):</span>
              <span className="font-semibold text-on-surface">{breakdown.ir} m³/h</span>
            </div>
          )}
          <div className="flex justify-between text-[11px] pt-1 border-t border-surface-container/40">
            <span className="text-outline">Alternative Inhaled:</span>
            <span className="font-bold text-primary">
              {breakdown.alternativeTotalUg !== null ? `${breakdown.alternativeTotalUg} µg` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Travel parameters if applicable */}
      {breakdown.distanceKm !== undefined && breakdown.efBase !== undefined && (
        <div className="p-2 rounded-lg bg-surface-container-lowest/80 border border-surface-container/60 flex flex-col gap-1">
          <span className="font-bold text-[11px] text-secondary">Travel Emission Constants</span>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">One-way distance:</span>
            <span className="font-semibold text-on-surface">{breakdown.distanceKm} km</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">Baseline emission factor (EF_base):</span>
            <span className="font-semibold text-on-surface">{breakdown.efBase} g CO₂/pkm</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">Alternative emission factor (EF_alt):</span>
            <span className="font-semibold text-on-surface">{breakdown.efAlt} g CO₂/pkm</span>
          </div>
        </div>
      )}

      {/* Purifier energy cost if applicable */}
      {breakdown.co2CostKg !== undefined && (
        <div className="p-2 rounded-lg bg-surface-container-lowest/80 border border-surface-container/60 flex flex-col gap-1">
          <span className="font-bold text-[11px] text-on-surface">Purifier Energy &amp; Grid Emissions</span>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">Power rating:</span>
            <span className="font-semibold text-on-surface">50 W</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">Grid emission factor:</span>
            <span className="font-semibold text-on-surface">0.82 kg CO₂/kWh</span>
          </div>
          <div className="flex justify-between text-[11px] pt-1 border-t border-surface-container/40">
            <span className="text-outline">Grid emissions incurred:</span>
            <span className="font-bold text-on-surface-variant">+{breakdown.co2CostKg} kg CO₂</span>
          </div>
        </div>
      )}

      {/* Household Multi-Member Sub-Breakdown */}
      {breakdown.memberBreakdown && breakdown.memberBreakdown.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          <span className="text-[11px] font-semibold text-on-surface-variant">
            Per-Member Exposure Avoidance Subtotal:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {breakdown.memberBreakdown.map((m: MemberExposureBreakdown) => (
              <div
                key={m.memberId}
                className="p-1.5 rounded bg-surface-container-lowest border border-surface-container/40 flex justify-between items-center text-[11px]"
              >
                <span className="font-medium text-on-surface truncate">
                  {m.memberName} ({m.ageGroup}):
                </span>
                <span className="font-bold text-primary shrink-0 ml-1">
                  {m.avoidedUg !== null ? `${m.avoidedUg} µg` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
