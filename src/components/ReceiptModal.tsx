import React from 'react';
import { Link } from 'react-router-dom';
import { EnrichedAction } from '../lib/impact/rulePlanner';
import { ImpactReceipt } from './ImpactReceipt';
import { useLanguage } from '../i18n';
import { SOURCES } from '../lib/impact/constants';

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
  const { t } = useLanguage();
  if (!action && !formulaOnly) return null;

  const isFormulaOnly = formulaOnly || !action;
  const breakdown = action?.impact.calculationBreakdown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full p-space-md lg:p-space-lg shadow-2xl border border-surface-container flex flex-col gap-space-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-space-sm border-b border-surface-container pb-space-sm">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
              {isFormulaOnly ? t.receipt.methodologyFormulas : t.receipt.impactReceiptTitle}
            </span>
            <h3 className="font-headline-sm text-[18px] text-on-surface font-bold mt-0.5">
              {isFormulaOnly ? (title || t.receipt.howWeCalculateImpact) : action?.title}
            </h3>
            {!isFormulaOnly && action && action.start && action.end && (
              <span className="text-[12px] text-on-surface-variant">
                {t.receipt.scheduledWindow} {action.start} – {action.end}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label={t.common.close}
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
                {t.receipt.exposureAvoided}
              </span>
              <span className="font-headline-sm text-headline-sm font-bold text-primary mt-1">
                {action.impact.exposureAvoidedUg !== null
                  ? `${action.impact.exposureAvoidedUg} µg PM2.5`
                  : t.receipt.unquantified}
              </span>
              <span className="text-[10px] text-outline mt-0.5">
                {t.receipt.baselineMinusAlt}
              </span>
            </div>

            <div className="bg-surface-container-low rounded-xl p-3 flex flex-col">
              <span className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold">
                {t.receipt.co2Saved}
              </span>
              <span className="font-headline-sm text-headline-sm font-bold text-secondary mt-1">
                {action.impact.co2SavedKg !== null
                  ? `${action.impact.co2SavedKg} kg CO₂`
                  : t.receipt.noModeChange}
              </span>
              <span className="text-[10px] text-outline mt-0.5">
                {t.receipt.directTailpipeSaving}
              </span>
            </div>
          </div>
        )}

        {/* Action Specific Calculation Breakdown */}
        {!isFormulaOnly && breakdown && action && (
          <ImpactReceipt
            breakdown={breakdown}
            exposureAvoidedUg={action.impact.exposureAvoidedUg}
            co2SavedKg={action.impact.co2SavedKg}
          />
        )}

        {/* Governing Mathematical Formulas */}
        <div className="flex flex-col gap-2 bg-surface-container-low/60 rounded-xl p-3 text-[13px] border border-surface-container/60">
          <span className="font-label-sm text-label-sm text-on-surface font-bold uppercase">
            {t.receipt.governingFormulas}
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
              • <strong>C_outdoor</strong>: {SOURCES.c_outdoor.source}.
            </p>
            <p>
              • <strong>F_env &amp; F_mask</strong>: {SOURCES.f_env.source} &amp; {SOURCES.f_mask.source}.
            </p>
            <p>
              • <strong>Inhalation Rate (IR)</strong>: {SOURCES.ir.source}.
            </p>
            <p>
              • <strong>Emission Factors (EF)</strong>: {SOURCES.ef.source}.
            </p>
            <p>
              • <strong>Cigarette Equivalents</strong>: {SOURCES.cigs.source}.
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
              {t.receipt.readCompleteMethodology}
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
            {t.receipt.disclaimer}
          </span>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container transition-colors cursor-pointer"
        >
          {t.common.close}
        </button>
      </div>
    </div>
  );
};
