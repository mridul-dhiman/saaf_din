import React from 'react';

export interface StatPillProps {
  icon?: string;
  value: string | number;
  unit?: string;
  label?: string;
  variant?: 'primary' | 'secondary' | 'neutral' | 'error' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  title?: string;
  className?: string;
}

const variantStyles = {
  primary: 'bg-primary-fixed/40 text-primary border border-primary/20',
  secondary: 'bg-secondary-fixed/50 text-secondary border border-secondary/20',
  neutral: 'bg-surface-container text-on-surface border border-surface-container-high',
  error: 'bg-error-container/40 text-error border border-error/20',
  outline: 'bg-transparent text-on-surface-variant border border-outline-variant/30',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[11px] gap-1',
  md: 'px-2.5 py-1 text-label-sm gap-1.5',
  lg: 'px-3.5 py-1.5 text-label-md gap-2',
};

export const StatPill: React.FC<StatPillProps> = ({
  icon,
  value,
  unit,
  label,
  variant = 'primary',
  size = 'md',
  onClick,
  title,
  className = '',
}) => {
  const content = (
    <>
      {icon && <span className="material-symbols-outlined text-[14px] shrink-0">{icon}</span>}
      <span className="font-bold">
        {value}
        {unit ? ` ${unit}` : ''}
      </span>
      {label && <span className="text-on-surface-variant font-medium text-[10px]">{label}</span>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`inline-flex items-center rounded-lg transition-colors cursor-pointer hover:opacity-85 font-semibold ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      title={title}
      className={`inline-flex items-center rounded-lg font-semibold ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {content}
    </div>
  );
};
