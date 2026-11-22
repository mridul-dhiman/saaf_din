import React from 'react';

export const OnboardingPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-space-lg max-w-3xl mx-auto">
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container">
        <div className="flex items-center gap-space-sm mb-space-sm">
          <span className="material-symbols-outlined text-primary text-[28px]">person</span>
          <h1 className="font-headline-md text-headline-md text-on-surface">Household Profile Setup</h1>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Configure your location, family members, sensitivities, and daily habits.
        </p>
      </div>
    </div>
  );
};
