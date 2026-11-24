import React from 'react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-space-md lg:p-space-lg shadow-2xl border border-surface-container flex flex-col gap-space-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-space-sm border-b border-surface-container pb-space-sm">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
              {isFormulaOnly ? 'Methodology & Impact Formulas' : 'Impact Receipt & Math Audit'}
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

        {/* Detailed Mathematical Breakdown */}
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

          <div className="flex flex-col gap-1 mt-1 text-on-surface-variant">
            <p>
              • <strong>C_outdoor</strong>: Hourly forecast from Open-Meteo CAMS grid model.
            </p>
            <p>
              • <strong>F_env &amp; F_mask</strong>: Documented penetration factors (Outdoors: 1.0, Indoors closed: 0.5, Purifier: 0.2, N95 mask: 0.3).
            </p>
            <p>
              • <strong>Inhalation Rate (IR)</strong>: Standard age and intensity rates from US EPA Exposure Factors Handbook (e.g. adult rest: 0.3, light: 0.7, moderate: 1.6 m³/h).
            </p>
            <p>
              • <strong>Emission Factors (EF)</strong>: India GHG Program transport factors (Solo Car: 170 g/pkm vs Metro: 30 g/pkm).
            </p>
            <p>
              • <strong>Cigarette Equivalents</strong>: Berkeley Earth rule of thumb (breathing 22 µg/m³ for 24h ≈ 1 cigarette).
            </p>
          </div>
        </div>

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
