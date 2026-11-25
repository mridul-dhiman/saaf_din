import React from 'react';
import { ActionCalculationBreakdown, MemberExposureBreakdown } from '../types';
import { useLanguage } from '../i18n';
import { PURIFIER_WATTS, GRID_KG_CO2_PER_KWH } from '../lib/impact/constants';

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
  const { t } = useLanguage();

  return (
    <div className={`flex flex-col gap-3 bg-surface-container-low rounded-xl p-3.5 border border-surface-container/70 text-[12px] ${className}`}>
      <div className="flex items-center justify-between border-b border-surface-container pb-2">
        <span className="font-label-sm text-label-sm text-on-surface font-bold uppercase tracking-wide">
          {t.receipt.calculationBreakdown}
        </span>
        <span className="font-label-sm text-[11px] text-on-surface-variant">
          {t.receipt.duration}: {breakdown.durationHours} hr
        </span>
      </div>

      {/* Summary figures if provided */}
      {(exposureAvoidedUg !== null || co2SavedKg !== null || (cigarettesAvoided !== undefined && cigarettesAvoided !== null)) && (
        <div className="grid grid-cols-3 gap-2 p-2 bg-surface-container-lowest rounded-lg border border-surface-container text-center">
          <div>
            <div className="text-[10px] text-on-surface-variant font-medium">{t.receipt.pm25Avoided}</div>
            <div className="text-[13px] font-bold text-primary">
              {exposureAvoidedUg !== null ? `${exposureAvoidedUg} µg` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-on-surface-variant font-medium">{t.receipt.co2Saved}</div>
            <div className="text-[13px] font-bold text-secondary">
              {co2SavedKg !== null ? `${co2SavedKg} kg` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-on-surface-variant font-medium">{t.receipt.cigarettes}</div>
            <div className="text-[13px] font-bold text-on-surface">
              {cigarettesAvoided !== undefined && cigarettesAvoided !== null ? cigarettesAvoided : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Hourly Forecast Concentrations */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold text-on-surface-variant">
          {t.receipt.hourlyForecastConc}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {breakdown.hourlyPm25.map((h: { hour: number; pm2_5: number | null }) => (
            <span
              key={h.hour}
              className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface font-mono text-[11px]"
            >
              {String(h.hour).padStart(2, '0')}:00 → {h.pm2_5 !== null ? `${h.pm2_5} µg/m³` : t.common.noData}
            </span>
          ))}
        </div>
      </div>

      {/* Parameters Comparison: Baseline vs Alternative */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        {/* Baseline Column */}
        <div className="p-2 rounded-lg bg-surface-container-lowest/80 border border-surface-container/60 flex flex-col gap-1">
          <span className="font-bold text-[11px] text-error">{t.receipt.baselineParams}</span>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">{t.receipt.environment}</span>
            <span className="font-semibold text-on-surface">{breakdown.fEnvBase}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">{t.receipt.mask}</span>
            <span className="font-semibold text-on-surface">{breakdown.fMaskBase}</span>
          </div>
          {breakdown.ir !== undefined && (
            <div className="flex justify-between text-[11px]">
              <span className="text-outline">{t.receipt.breathingRate}</span>
              <span className="font-semibold text-on-surface">{breakdown.ir} m³/h</span>
            </div>
          )}
          <div className="flex justify-between text-[11px] pt-1 border-t border-surface-container/40">
            <span className="text-outline">{t.receipt.baselineInhaled}</span>
            <span className="font-bold text-error">
              {breakdown.baselineTotalUg !== null ? `${breakdown.baselineTotalUg} µg` : '—'}
            </span>
          </div>
        </div>

        {/* Alternative Column */}
        <div className="p-2 rounded-lg bg-surface-container-lowest/80 border border-surface-container/60 flex flex-col gap-1">
          <span className="font-bold text-[11px] text-primary">{t.receipt.altParams}</span>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">{t.receipt.environment}</span>
            <span className="font-semibold text-on-surface">{breakdown.fEnvAlt}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">{t.receipt.mask}</span>
            <span className="font-semibold text-on-surface">{breakdown.fMaskAlt}</span>
          </div>
          {breakdown.ir !== undefined && (
            <div className="flex justify-between text-[11px]">
              <span className="text-outline">{t.receipt.breathingRate}</span>
              <span className="font-semibold text-on-surface">{breakdown.ir} m³/h</span>
            </div>
          )}
          <div className="flex justify-between text-[11px] pt-1 border-t border-surface-container/40">
            <span className="text-outline">{t.receipt.altInhaled}</span>
            <span className="font-bold text-primary">
              {breakdown.alternativeTotalUg !== null ? `${breakdown.alternativeTotalUg} µg` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Travel parameters if applicable */}
      {breakdown.distanceKm !== undefined && breakdown.efBase !== undefined && (
        <div className="p-2 rounded-lg bg-surface-container-lowest/80 border border-surface-container/60 flex flex-col gap-1">
          <span className="font-bold text-[11px] text-secondary">{t.receipt.travelEmissionConstants}</span>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">{t.receipt.oneWayDistance}</span>
            <span className="font-semibold text-on-surface">{breakdown.distanceKm} km</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">{t.receipt.baseEf}</span>
            <span className="font-semibold text-on-surface">{breakdown.efBase} g CO₂/pkm</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">{t.receipt.altEf}</span>
            <span className="font-semibold text-on-surface">{breakdown.efAlt} g CO₂/pkm</span>
          </div>
        </div>
      )}

      {/* Purifier energy cost if applicable */}
      {breakdown.co2CostKg !== undefined && (
        <div className="p-2 rounded-lg bg-surface-container-lowest/80 border border-surface-container/60 flex flex-col gap-1">
          <span className="font-bold text-[11px] text-on-surface">{t.receipt.purifierEnergy}</span>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">{t.receipt.powerRating}</span>
            <span className="font-semibold text-on-surface">{PURIFIER_WATTS} W</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-outline">{t.receipt.gridEf}</span>
            <span className="font-semibold text-on-surface">{GRID_KG_CO2_PER_KWH} kg CO₂/kWh</span>
          </div>
          <div className="flex justify-between text-[11px] pt-1 border-t border-surface-container/40">
            <span className="text-outline">{t.receipt.gridEmissionsIncurred}</span>
            <span className="font-bold text-on-surface-variant">+{breakdown.co2CostKg} kg CO₂</span>
          </div>
        </div>
      )}

      {/* Household Multi-Member Sub-Breakdown */}
      {breakdown.memberBreakdown && breakdown.memberBreakdown.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          <span className="text-[11px] font-semibold text-on-surface-variant">
            {t.receipt.perMemberSubtotal}
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
