import React, { useState } from 'react';
import { Profile } from '../types';

interface ShareCardModalProps {
  profile: Profile;
  pm25AvoidedUg: number;
  co2SavedKg: number;
  cigarettesAvoided: string;
  completedActionsCount: number;
  onClose: () => void;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  profile,
  pm25AvoidedUg,
  co2SavedKg,
  cigarettesAvoided,
  completedActionsCount,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const shareText = `🌿 Today my household in ${profile.location.name} avoided ${pm25AvoidedUg} µg of PM2.5 and saved ${co2SavedKg} kg of CO2 (${cigarettesAvoided} cigarettes avoided) by following optimized clean routines on SaafDin! Check your exposure: https://saaf-din.web.app`;

  const handleCopyOrShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SaafDin — My Daily Clean Air Impact',
          text: shareText,
          url: 'https://saaf-din.web.app',
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-space-md lg:p-space-lg shadow-2xl border border-surface-container flex flex-col gap-space-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-container pb-space-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">share</span>
            <h3 className="font-headline-sm text-[17px] text-on-surface font-bold">
              Share Your Daily Impact
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container text-outline hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Visual Share Card */}
        <div className="bg-primary text-on-primary rounded-2xl p-space-lg shadow-lg flex flex-col gap-space-md relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-secondary-fixed/20 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex flex-col">
              <span className="font-headline-sm text-[20px] font-bold text-white tracking-tight">
                SaafDin
              </span>
              <span className="font-label-sm text-[10px] text-primary-fixed uppercase tracking-wider font-semibold">
                Today's clean air impact
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-primary-fixed font-label-sm text-[11px] font-bold">
              {profile.location.name}
            </span>
          </div>

          {/* Core Metrics */}
          <div className="grid grid-cols-3 gap-2 relative z-10">
            <div className="bg-primary-container/40 rounded-xl p-2.5 flex flex-col items-center text-center">
              <span className="font-headline-sm text-[17px] font-bold text-white">
                {pm25AvoidedUg} µg
              </span>
              <span className="text-[10px] text-primary-fixed mt-0.5 leading-tight">
                PM2.5 Avoided
              </span>
            </div>

            <div className="bg-primary-container/40 rounded-xl p-2.5 flex flex-col items-center text-center">
              <span className="font-headline-sm text-[17px] font-bold text-white">
                {co2SavedKg} kg
              </span>
              <span className="text-[10px] text-primary-fixed mt-0.5 leading-tight">
                CO₂ Saved
              </span>
            </div>

            <div className="bg-primary-container/40 rounded-xl p-2.5 flex flex-col items-center text-center">
              <span className="font-headline-sm text-[17px] font-bold text-secondary-fixed">
                {cigarettesAvoided}
              </span>
              <span className="text-[10px] text-primary-fixed mt-0.5 leading-tight">
                Cigarettes
              </span>
            </div>
          </div>

          <div className="text-[11px] text-primary-fixed/80 border-t border-primary-container/60 pt-2 relative z-10 flex items-center justify-between">
            <span>{completedActionsCount} clean routine actions taken today</span>
            <span className="font-semibold text-white">saaf-din.web.app</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleCopyOrShare}
          className="w-full py-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">
            {copied ? 'check' : 'ios_share'}
          </span>
          <span>{copied ? 'Copied to Clipboard! ✓' : 'Share or Copy Card'}</span>
        </button>
      </div>
    </div>
  );
};
