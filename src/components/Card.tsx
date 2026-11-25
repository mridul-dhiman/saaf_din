import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'container' | 'low' | 'lowest';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'xl' | '2xl' | '3xl';
  children: React.ReactNode;
}

const variantStyles = {
  surface: 'bg-surface text-on-surface border border-outline-variant/20',
  container: 'bg-surface-container text-on-surface border border-outline-variant/15',
  low: 'bg-surface-container-low text-on-surface border border-surface-container',
  lowest: 'bg-surface-container-lowest text-on-surface border border-surface-container shadow-sm',
};

const paddingStyles = {
  none: 'p-0',
  sm: 'p-space-sm',
  md: 'p-space-md',
  lg: 'p-space-md lg:p-space-lg',
  xl: 'p-space-lg lg:p-space-xl',
};

const roundedStyles = {
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
};

export const Card: React.FC<CardProps> = ({
  variant = 'lowest',
  padding = 'md',
  rounded = '2xl',
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`${variantStyles[variant]} ${paddingStyles[padding]} ${roundedStyles[rounded]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
