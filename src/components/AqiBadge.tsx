import React from 'react';
import { getAqiBand } from '../lib/aqi';

export interface AqiBadgeProps {
  aqi: number | null;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AqiBadge: React.FC<AqiBadgeProps> = ({
  aqi,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  if (aqi === null) {
    return (
      <span className={`inline-flex items-center text-outline bg-surface-container px-2 py-0.5 rounded-full text-[11px] font-medium ${className}`}>
        No data
      </span>
    );
  }

  const band = getAqiBand(aqi);

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-label-sm px-2.5 py-1 gap-1.5',
    lg: 'text-label-md px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold ${band.bgClass} ${band.colorClass} ${sizeClasses[size]} ${className}`}
    >
      <span>{aqi}</span>
      {showLabel && (
        <span className="font-semibold opacity-90 text-[10px]">
          {band.shortLabel}
        </span>
      )}
    </span>
  );
};
