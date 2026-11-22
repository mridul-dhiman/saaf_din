import React from 'react';

export const AssistantPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-space-lg">
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container">
        <div className="flex items-center gap-space-sm mb-space-sm">
          <span className="material-symbols-outlined text-primary text-[28px]">forum</span>
          <h1 className="font-headline-md text-headline-md text-on-surface">Clean Air Assistant</h1>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Context-aware AI guidance grounded in your family profile and hourly forecast.
        </p>
      </div>
    </div>
  );
};
