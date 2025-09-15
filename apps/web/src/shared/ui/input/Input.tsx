import { InputHTMLAttributes, useId, type ReactElement } from 'react';

import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

/**
 * Baseball-themed input component with 48px minimum touch targets
 * Supports validation states and accessibility features
 *
 * @example
 * <Input label="Player Name" placeholder="Enter first and last name" />
 * <Input type="number" label="Jersey Number" error="Number must be unique" />
 */
export const Input = ({
  label,
  error,
  helpText,
  className,
  disabled,
  type = 'text',
  id: providedId,
  ...props
}: InputProps): ReactElement => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const helpTextId = helpText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = errorId || helpTextId;

  const baseClasses =
    'min-h-touch w-full px-4 py-2 text-base border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1';

  const stateClasses = error
    ? 'border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:ring-field-green-500 focus:border-field-green-500';

  const disabledClasses = disabled
    ? 'bg-gray-100 cursor-not-allowed opacity-60'
    : 'bg-white hover:border-gray-400';

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <input
        id={id}
        type={type}
        className={cn(baseClasses, stateClasses, disabledClasses, className)}
        disabled={disabled}
        aria-describedby={describedBy}
        {...props}
      />

      {helpText && !error && (
        <p id={helpTextId} className="mt-1 text-sm text-gray-600">
          {helpText}
        </p>
      )}

      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
