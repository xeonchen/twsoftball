import React, { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  touchTarget?: boolean;
  'aria-label'?: string;
}

/**
 * Baseball-themed button component with 48px minimum touch targets
 * Implements softball color scheme and accessibility requirements
 *
 * @example
 * <Button variant="primary" size="large">Start Game</Button>
 * <Button variant="secondary" disabled>Cancel</Button>
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  touchTarget = true,
  className,
  disabled,
  type = 'button',
  'aria-label': ariaLabel,
  ...props
}: ButtonProps): React.ReactElement => {
  const baseClasses = [
    'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
    touchTarget ? 'min-h-touch min-w-touch' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const variantClasses = {
    primary: 'bg-field-green-600 hover:bg-field-green-700 text-white focus:ring-field-green-500',
    secondary:
      'bg-dirt-brown-100 hover:bg-dirt-brown-200 text-dirt-brown-700 focus:ring-dirt-brown-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
  };

  const sizeClasses = {
    small: 'px-3 py-2 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type={type}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      {...props}
    >
      {loading ? <span>Loading...</span> : children}
    </button>
  );
};
