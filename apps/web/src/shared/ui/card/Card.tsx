import React, { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'flush';
  size?: 'small' | 'medium' | 'large' | 'xl';
}

/**
 * Baseball-themed card component for organizing content
 * Supports multiple variants and interactive states
 *
 * @example
 * <Card variant="elevated" size="large">
 *   <h3>Game Summary</h3>
 *   <p>Final Score: Home 7 - Away 3</p>
 * </Card>
 */
export const Card = ({
  children,
  variant = 'default',
  size = 'medium',
  className,
  onClick,
  ...props
}: CardProps): React.ReactElement => {
  const isClickable = !!onClick;

  const baseClasses = 'w-full rounded-lg bg-white';

  const variantClasses = {
    default: 'shadow-md',
    elevated: 'shadow-lg',
    outlined: 'border border-gray-200 shadow-sm',
    flush: 'shadow-none border-0',
  };

  const sizeClasses = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6',
    xl: 'p-8',
  };

  const interactiveClasses = isClickable
    ? 'cursor-pointer hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-field-green-500 focus:ring-offset-2'
    : '';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>);
    }
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        interactiveClasses,
        className
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
};
