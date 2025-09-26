import React from 'react';

/**
 * At-bat result type definitions
 */
export type AtBatResultType =
  | 'SINGLE'
  | 'DOUBLE'
  | 'TRIPLE'
  | 'HOME_RUN'
  | 'WALK'
  | 'STRIKEOUT'
  | 'GROUND_OUT'
  | 'FLY_OUT'
  | 'OUT'
  | 'ERROR'
  | 'FIELDERS_CHOICE'
  | 'SACRIFICE_FLY'
  | 'DOUBLE_PLAY'
  | 'TRIPLE_PLAY';

/**
 * At-bat result interface
 */
export interface AtBatResult {
  type: AtBatResultType;
  label: string;
  category: 'hit' | 'walk' | 'out' | 'other';
}

/**
 * Props interface for AtBatActionPanel component
 */
export interface AtBatActionPanelProps {
  // Actions
  onResultSelect: (result: AtBatResult) => void;

  // State
  disabled?: boolean;

  // Customization
  primaryActions?: AtBatResult[];
  showExpandedOptions?: boolean;

  // Accessibility
  'aria-label'?: string;
  className?: string;
}

/**
 * Default primary actions based on wireframes and frequency
 */
const DEFAULT_PRIMARY_ACTIONS: AtBatResult[] = [
  { type: 'SINGLE', label: 'SINGLE', category: 'hit' },
  { type: 'OUT', label: 'OUT', category: 'out' },
  { type: 'WALK', label: 'WALK', category: 'walk' },
  { type: 'DOUBLE', label: 'DOUBLE', category: 'hit' },
  { type: 'TRIPLE', label: 'TRIPLE', category: 'hit' },
  { type: 'HOME_RUN', label: 'HOME RUN', category: 'hit' },
];

/**
 * Extended actions for expanded mode
 */
const EXTENDED_ACTIONS: AtBatResult[] = [
  { type: 'STRIKEOUT', label: 'STRIKEOUT', category: 'out' },
  { type: 'GROUND_OUT', label: 'GROUND OUT', category: 'out' },
  { type: 'FLY_OUT', label: 'FLY OUT', category: 'out' },
  { type: 'ERROR', label: 'ERROR', category: 'other' },
  { type: 'FIELDERS_CHOICE', label: 'FIELDERS CHOICE', category: 'other' },
  { type: 'SACRIFICE_FLY', label: 'SACRIFICE FLY', category: 'other' },
  { type: 'DOUBLE_PLAY', label: 'DOUBLE PLAY', category: 'out' },
  { type: 'TRIPLE_PLAY', label: 'TRIPLE PLAY', category: 'out' },
];

/**
 * AtBatActionPanel Component
 *
 * Displays action buttons for recording at-bat results with proper thumb zone optimization.
 * Follows wireframes specifications with primary actions prominently displayed and
 * scrollable content for additional options.
 *
 * Layout per wireframes:
 * - SINGLE takes full width (most common, 60px height)
 * - Secondary actions in 2-column grid (48px height)
 * - Scrollable area for less common actions
 * - Touch targets meet 48px minimum requirement
 *
 * Features:
 * - Thumb zone optimization for one-handed operation
 * - Configurable primary actions
 * - Expanded mode for additional options
 * - Full keyboard and accessibility support
 * - Performance optimized for rapid tapping
 *
 * @example
 * ```tsx
 * <AtBatActionPanel
 *   onResultSelect={handleAtBatResult}
 *   disabled={false}
 *   showExpandedOptions={true}
 *   aria-label="Select at-bat result"
 * />
 * ```
 */
export const AtBatActionPanel: React.FC<AtBatActionPanelProps> = ({
  onResultSelect,
  disabled = false,
  primaryActions = DEFAULT_PRIMARY_ACTIONS,
  showExpandedOptions = false,
  'aria-label': ariaLabel = 'Select at-bat result',
  className = '',
}) => {
  // Combine actions based on configuration
  const allActions = showExpandedOptions
    ? [...primaryActions, ...EXTENDED_ACTIONS]
    : primaryActions;

  // Handle action selection
  const handleActionClick = (action: AtBatResult): void => {
    if (!disabled) {
      onResultSelect(action);
    }
  };

  // Handle keyboard interaction
  const handleKeyDown = (event: React.KeyboardEvent, action: AtBatResult): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleActionClick(action);
    }
  };

  // Get button styling based on action type and priority
  const getButtonClasses = (_action: AtBatResult, index: number): string => {
    const baseClasses = [
      'font-semibold',
      'rounded-lg',
      'border-2',
      'transition-all',
      'duration-150',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-blue-500',
      'focus:ring-offset-2',
      'active:scale-95',
    ];

    // First action (SINGLE) gets special treatment - full width and larger
    if (index === 0) {
      baseClasses.push(
        'w-full',
        'min-h-[60px]',
        'text-lg',
        'bg-blue-600',
        'text-white',
        'border-blue-600',
        'hover:bg-blue-700',
        'disabled:bg-gray-400'
      );
    } else {
      // Secondary actions - smaller, 2-column layout
      baseClasses.push(
        'min-h-[48px]',
        'text-base',
        'bg-gray-100',
        'text-gray-800',
        'border-gray-300',
        'hover:bg-gray-200',
        'disabled:bg-gray-200',
        'disabled:text-gray-400'
      );
    }

    if (disabled) {
      baseClasses.push('cursor-not-allowed', 'opacity-50');
    } else {
      baseClasses.push('cursor-pointer');
    }

    return baseClasses.join(' ');
  };

  return (
    <div
      data-testid="action-panel-container"
      className={`h-full overflow-y-auto ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      <div className="p-4 space-y-3">
        {/* Primary action (SINGLE) - Full width */}
        {allActions.length > 0 && (
          <button
            className={getButtonClasses(allActions[0]!, 0)}
            onClick={() => handleActionClick(allActions[0]!)}
            onKeyDown={e => handleKeyDown(e, allActions[0]!)}
            disabled={disabled}
            aria-label={`Record ${allActions[0]!.label}`}
          >
            {allActions[0]!.label}
          </button>
        )}

        {/* Secondary actions - 2-column grid */}
        {allActions.length > 1 && (
          <div data-testid="actions-grid" className="grid grid-cols-2 gap-3">
            {allActions.slice(1).map((action, index) => (
              <button
                key={action.type}
                className={getButtonClasses(action, index + 1)}
                onClick={() => handleActionClick(action)}
                onKeyDown={e => handleKeyDown(e, action)}
                disabled={disabled}
                aria-label={`Record ${action.label}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Expanded options note */}
        {!showExpandedOptions && (
          <div className="text-center pt-2">
            <span className="text-sm text-gray-500">Scroll down for more options</span>
          </div>
        )}
      </div>
    </div>
  );
};
