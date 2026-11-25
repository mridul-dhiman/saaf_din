import React from 'react';
import { Link } from 'react-router-dom';
import { EnrichedAction } from '../lib/impact/rulePlanner';

interface ReceiptModalProps {
  action?: EnrichedAction | null;
  formulaOnly?: boolean;
  title?: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  action,
  formulaOnly = false,
  title,
  onClose,
}) => {
  const isFormulaOnly = formulaOnly || !action;
  const breakdown = action?.impact.calculationBreakdown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full p-space-md lg:p-space-lg shadow-2xl border border-surface-container flex flex-col gap-space-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-space-sm border-b border-surface-container pb-space-sm">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
              {isFormulaOnly ? 'Methodology & Impact Formulas' : 'Impact Receipt & Calculation Audit'}
            </span>
            <h3 className="font-headline-sm text-[18px] text-on-surface font-bold mt-0.5">
              {isFormulaOnly ? (title || 'How We Calculate Impact') : action?.title}
            </h3>
            {!isFormulaOnly && action && (
              <span className="text-[12px] text-on-surface-variant">
                Scheduled window: {action.start} – {action.end}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Impact Figures Summary (Only in action receipt mode) */}
        {!isFormulaOnly && action && (
          <div className="grid grid-cols-2 gap-space-sm">
            <div className="bg-surface-container-low rounded-xl p-3 flex flex-col">
              <span className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold">
                Exposure Avoided
              </span>
              <span className="font-headline-sm text-headline-sm font-bold text-primary mt-1">
                {action.impact.exposureAvoidedUg !== null
                  ? `${action.impact.exposureAvoidedUg} µg PM2.5`
                  : 'Unquantified'}
              </span>
              <span className="text-[10px] text-outline mt-0.5">
                Baseline inhaled minus alternative
              </span>
            </div>

            <div className="bg-surface-container-low rounded-xl p-3 flex flex-col">
              <span className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold">
                CO₂ Emissions Saved
              </span>
              <span className="font-headline-sm text-headline-sm font-bold text-secondary mt-1">
                {action.impact.co2SavedKg !== null
                  ? `${action.impact.co2SavedKg} kg CO₂`
                  : 'No mode change'}
              </span>
              <span className="text-[10px] text-outline mt-0.5">
                Direct tailpipe saving
              </span>
            </div>
          </div>
        )}

        {/* Action Specific Calculation Breakdown */}
        {!isFormulaOnly && breakdown && (
          <div className="flex flex-col gap-2.5 bg-surface-container-low rounded-xl p-3.5 border border-surface-container/70 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface font-bold uppercase tracking-wide">
                Calculation Audit Breakdown
              </span>
              <span className="font-label-sm text-[11px] text-on-surface-variant">
                Duration: {breakdown.durationHours} hr
              </span>
            </div>

            {/* Hourly PM2.5 Concentrations Used */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-on-surface-variant">
                Hourly Forecast Concentrations (C_outdoor):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {breakdown.hourlyPm25.map((h) => (
                  <span
                    key={h.hour}
                    className="px-2 py-0.5 bg-surface-container-lowest rounded-md border border-surface-container text-[11px] font-mono"
                  >
                    {String(h.hour).padStart(2, '0')}:00 →{' '}
                    <strong className="text-on-surface font-bold">
                      {h.pm2_5 !== null ? `${h.pm2_5} µg/m³` : 'null'}
                    </strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Factors Used */}
            <div className="grid grid-cols-2 gap-2 mt-1 bg-surface-container-lowest p-2.5 rounded-lg border border-surface-container text-[11px]">
              <div className="flex flex-col gap-0.5">
                <span className="text-on-surface-variant font-medium">Environment Factor (F_env):</span>
                <span className="font-mono">
                  Baseline: <strong>{breakdown.fEnvBase}</strong> → Alt: <strong>{breakdown.fEnvAlt}</strong>
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-on-surface-variant font-medium">Mask Factor (F_mask):</span>
                <span className="font-mono">
                  Baseline: <strong>{breakdown.fMaskBase}</strong> → Alt: <strong>{breakdown.fMaskAlt}</strong>
                </span>
              </div>
            </div>

            {/* Member Breakdown for Household Actions */}
            {breakdown.isHousehold && breakdown.memberBreakdown && breakdown.memberBreakdown.length > 0 && (
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-[11px] font-semibold text-on-surface-variant">
                  Household Member Exposure Breakdown:
                </span>
                <div className="overflow-x-auto rounded-lg border border-surface-container">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-surface-container-high text-on-surface-variant font-semibold">
                        <th className="p-1.5">Member</th>
                        <th className="p-1.5">Age Group</th>
                        <th className="p-1.5">IR (m³/h)</th>
                        <th className="p-1.5 text-right">Base Inhaled</th>
                        <th className="p-1.5 text-right">Alt Inhaled</th>
                        <th className="p-1.5 text-right font-bold text-primary">Avoided</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                      {breakdown.memberBreakdown.map((mb) => (
                        <tr key={mb.memberId} className="bg-surface-container-lowest">
                          <td className="p-1.5 font-medium">{mb.memberName}</td>
                          <td className="p-1.5 capitalize text-on-surface-variant">{mb.ageGroup}</td>
                          <td className="p-1.5 font-mono">{mb.ir}</td>
                          <td className="p-1.5 text-right font-mono">{mb.baselineInhaledUg ?? '—'} µg</td>
                          <td className="p-1.5 text-right font-mono">{mb.altInhaledUg ?? '—'} µg</td>
                          <td className="p-1.5 text-right font-mono font-bold text-primary">
                            {mb.avoidedUg !== null ? `${mb.avoidedUg} µg` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Individual Inhalation & Total */}
            {!breakdown.isHousehold && breakdown.ir !== undefined && (
              <div className="flex items-center justify-between bg-surface-container-lowest p-2 rounded-lg border border-surface-container text-[11px]">
                <span>Inhalation Rate (IR): <strong className="font-mono">{breakdown.ir} m³/h</strong></span>
                <span>
                  Inhaled: <strong className="font-mono">{breakdown.baselineTotalUg ?? '—'} µg</strong> →{' '}
                  <strong className="font-mono text-primary">{breakdown.alternativeTotalUg ?? '—'} µg</strong>
                </span>
              </div>
            )}

            {/* Commute parameters */}
            {breakdown.distanceKm !== undefined && (
              <div className="grid grid-cols-2 gap-2 bg-surface-container-lowest p-2 rounded-lg border border-surface-container text-[11px]">
                <div>Distance: <strong className="font-mono">{breakdown.distanceKm} km</strong></div>
                <div>
                  EF: <strong className="font-mono">{breakdown.efBase}</strong> →{' '}
                  <strong className="font-mono text-secondary">{breakdown.efAlt} g CO₂/pkm</strong>
                </div>
              </div>
            )}

            {/* Purifier electricity CO2 cost */}
            {breakdown.co2CostKg !== undefined && (
              <div className="flex items-center justify-between bg-surface-container-lowest p-2 rounded-lg border border-surface-container text-[11px]">
                <span className="text-on-surface-variant">Purifier Electricity CO₂ Cost (45W, grid factor 0.7):</span>
                <span className="font-mono font-semibold text-outline">+{breakdown.co2CostKg} kg CO₂</span>
              </div>
            )}
          </div>
        )}

        {/* Governing Mathematical Formulas */}
        <div className="flex flex-col gap-2 bg-surface-container-low/60 rounded-xl p-3 text-[13px] border border-surface-container/60">
          <span className="font-label-sm text-label-sm text-on-surface font-bold uppercase">
            Governing Impact Formulas
          </span>

          <div className="flex flex-col gap-1.5 text-on-surface-variant font-mono text-[12px] bg-surface-container-lowest p-2.5 rounded-lg border border-surface-container">
            <span className="text-primary font-semibold">
              inhaled_ug = Σ ( C_outdoor[h] × F_env × F_mask × IR × Δt )
            </span>
            <span className="text-secondary font-semibold">
              co2_saved_kg = distance_km × ( EF_baseline − EF_alt ) / 1000
            </span>
            <span className="text-outline font-semibold">
              cigs_avoided = Σ ( (C_eff_base − C_eff_alt) × Δt ) / (22 × 24)
            </span>
          </div>

          <div className="flex flex-col gap-1 mt-1 text-on-surface-variant text-[12px]">
            <p>
              • <strong>C_outdoor</strong>: Hourly forecast from Open-Meteo CAMS grid model.
            </p>
            <p>
              • <strong>F_env &amp; F_mask</strong>: Penetration factors (Outdoors: 1.0, Indoors closed: 0.5, Purifier: 0.2, N95 mask: 0.3).
            </p>
            <p>
              • <strong>Inhalation Rate (IR)</strong>: Age &amp; intensity rates from US EPA Exposure Factors Handbook.
            </p>
            <p>
              • <strong>Emission Factors (EF)</strong>: India GHG Program transport factors (Solo Car: 170 g/pkm, Metro: 30 g/pkm).
            </p>
            <p>
              • <strong>Cigarette Equivalents</strong>: Berkeley Earth rule of thumb (22 µg/m³ for 24h ≈ 1 cigarette).
            </p>
          </div>
        </div>

        {/* Deep Link to full methodology page */}
        <Link
          to="/how-we-calculate"
          onClick={onClose}
          className="flex items-center justify-between p-3 rounded-xl bg-secondary-container/30 hover:bg-secondary-container/50 border border-secondary/20 text-secondary transition-colors group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            <span className="font-label-md text-label-md font-bold">
              Read Complete Methodology &amp; Constants Checklist
            </span>
          </div>
          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
            arrow_forward
          </span>
        </Link>

        {/* Disclaimer */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-high/60 text-outline text-[11px]">
          <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">
            info
          </span>
          <span>
            Screening-level estimates intended for comparative habit guidance. Not clinical medical diagnoses.
          </span>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};
