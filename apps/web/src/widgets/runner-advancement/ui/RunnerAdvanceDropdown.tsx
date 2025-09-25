/**
 * @file RunnerAdvanceDropdown.tsx
 *
 * Individual runner selection component for advancement options.
 * Handles validation rules, forced advances, and accessibility.
 *
 * @remarks
 * This component provides a dropdown interface for selecting where a runner
 * advances during an at-bat. It integrates with the useRunnerAdvancement hook
 * to provide validation and handles various baseball scenarios like forced
 * advances and occupied bases.
 *
 * Features:
 * - Valid advancement options based on baseball rules
 * - Disabled options for invalid moves (backwards, occupied bases)
 * - Forced advance handling with read-only display
 * - Baseball-inspired visual design with field green theme
 * - Mobile-first responsive design with 48px touch targets
 * - Full accessibility support with ARIA labels
 * - Error state handling with validation feedback
 *
 * @example
 * ```tsx
 * <RunnerAdvanceDropdown
 *   runnerId="runner-1"
 *   runnerName="Alice Smith"
 *   fromBase={1}
 *   toBase={2}
 *   onAdvanceChange={handleAdvanceChange}
 *   canAdvanceToBase={canAdvanceToBase}
 *   isForced={false}
 *   error={undefined}
 * />
 * ```
 */

import React, { useCallback, useMemo } from 'react';

import type { RunnerAdvance } from '../../../shared/lib/hooks/useRunnerAdvancement';

/**
 * Props interface for RunnerAdvanceDropdown component
 */
export interface RunnerAdvanceDropdownProps {
  /** ID of the runner */
  runnerId: string;
  /** Display name of the runner */
  runnerName: string;
  /** Current base position (1=first, 2=second, 3=third) */
  fromBase: number;
  /** Selected destination base (1=first, 2=second, 3=third, 0=home/scores) */
  toBase?: number | undefined;
  /** Callback when advance selection changes */
  onAdvanceChange: (advance: RunnerAdvance) => void;
  /** Function to validate if runner can advance to specific base */
  canAdvanceToBase?: (runnerId: string, fromBase: number, toBase: number) => boolean;
  /** Whether this advance is forced (disabled dropdown) */
  isForced?: boolean;
  /** Whether dropdown is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Base position labels for display
 */
const BASE_LABELS: Record<number, string> = {
  1: '1st base',
  2: '2nd base',
  3: '3rd base',
};

/**
 * Advancement option interface
 */
interface AdvancementOption {
  value: number;
  label: string;
  disabled: boolean;
}

/**
 * RunnerAdvanceDropdown Component
 *
 * Provides a dropdown interface for selecting runner advancement options
 * with proper validation and accessibility support.
 */
export const RunnerAdvanceDropdown: React.FC<RunnerAdvanceDropdownProps> = ({
  runnerId,
  runnerName,
  fromBase,
  toBase,
  onAdvanceChange,
  canAdvanceToBase = (): boolean => true,
  isForced = false,
  disabled = false,
  error,
  className = '',
}) => {
  // Get base label for current position
  const baseLabel = BASE_LABELS[fromBase] || `${fromBase}st base`;

  /**
   * Calculate valid advancement options based on current base
   */
  const advancementOptions = useMemo((): AdvancementOption[] => {
    const options: AdvancementOption[] = [];

    // Add "stay on current base" option
    options.push({
      value: fromBase,
      label: `Stay on ${baseLabel}`,
      disabled: false,
    });

    // Add advancement options based on current base
    const possibleAdvances: Array<{ base: number; label: string }> = [];

    if (fromBase === 1) {
      possibleAdvances.push(
        { base: 2, label: '2nd base' },
        { base: 3, label: '3rd base' },
        { base: 0, label: 'HOME (scores)' }
      );
    } else if (fromBase === 2) {
      possibleAdvances.push({ base: 3, label: '3rd base' }, { base: 0, label: 'HOME (scores)' });
    } else if (fromBase === 3) {
      possibleAdvances.push({ base: 0, label: 'HOME (scores)' });
    }

    // Add options with validation
    possibleAdvances.forEach(({ base, label }) => {
      let isDisabled = false;

      try {
        isDisabled = !canAdvanceToBase(runnerId, fromBase, base);
      } catch (_error) {
        // Handle validation function errors gracefully
        // Error would be logged via DI container logger in full implementation
        isDisabled = true;
      }

      options.push({
        value: base,
        label,
        disabled: isDisabled,
      });
    });

    return options;
  }, [runnerId, fromBase, baseLabel, canAdvanceToBase]);

  /**
   * Handle dropdown value change
   */
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (disabled || isForced) return;

      const newToBase = parseInt(event.target.value, 10);

      onAdvanceChange({
        runnerId,
        fromBase,
        toBase: newToBase,
      });
    },
    [disabled, isForced, onAdvanceChange, runnerId, fromBase]
  );

  /**
   * Get current selection value
   */
  const currentValue = toBase !== undefined ? toBase.toString() : fromBase.toString();

  /**
   * Generate CSS classes for container
   */
  const containerClasses = useMemo(() => {
    const baseClasses = [
      'w-full',
      'p-3',
      'rounded-lg',
      'border-2',
      'transition-all',
      'duration-200',
    ];

    // Baseball-inspired styling
    if (isForced) {
      baseClasses.push('border-yellow-500', 'bg-yellow-50');
    } else if (error) {
      baseClasses.push('border-red-500', 'bg-red-50');
    } else {
      baseClasses.push('border-green-300', 'bg-green-50');
    }

    return [...baseClasses, className].join(' ');
  }, [isForced, error, className]);

  /**
   * Generate CSS classes for select element
   */
  const selectClasses = useMemo(() => {
    const baseClasses = [
      'w-full',
      'min-h-[48px]', // Touch target requirement
      'px-3',
      'py-2',
      'rounded-md',
      'border-2',
      'bg-white',
      'font-medium',
      'text-gray-900',
      'transition-all',
      'duration-150',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-green-500',
      'focus:border-green-500',
    ];

    if (error) {
      baseClasses.push('border-red-500', 'ring-red-500');
    } else {
      baseClasses.push('border-gray-300');
    }

    if (disabled || isForced) {
      baseClasses.push(
        'disabled:opacity-50',
        'disabled:cursor-not-allowed',
        'disabled:bg-gray-100'
      );
    }

    return baseClasses.join(' ');
  }, [error, disabled, isForced]);

  /**
   * Generate ARIA label for accessibility
   */
  const ariaLabel = `Select advance for ${runnerName || 'runner'} from ${baseLabel}`;

  /**
   * Generate error ID for ARIA describedby
   */
  const errorId = error ? `${runnerId}-error` : undefined;

  return (
    <div className={containerClasses}>
      {/* Runner info header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{runnerName || 'Runner'}</p>
          <p className="text-sm text-gray-600">{baseLabel}</p>
        </div>
        {isForced && (
          <span className="px-2 py-1 text-xs font-bold text-yellow-800 bg-yellow-200 rounded-full">
            FORCED
          </span>
        )}
      </div>

      {/* Dropdown selection */}
      <select
        data-testid="runner-advance-dropdown"
        value={currentValue}
        onChange={handleChange}
        disabled={disabled || isForced}
        className={selectClasses}
        aria-label={ariaLabel}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={errorId}
      >
        {advancementOptions.map(option => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={option.disabled ? 'text-gray-400 bg-gray-100' : ''}
          >
            {option.label}
          </option>
        ))}
      </select>

      {/* Error message */}
      {error && (
        <div id={errorId} className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
