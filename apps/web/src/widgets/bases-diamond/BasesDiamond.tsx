import React from 'react';

import { Player } from '../../shared/lib/store/gameStore';

/**
 * Base state interface for individual base
 */
export interface BaseState {
  playerId?: string;
  playerName?: string;
  jerseyNumber?: string;
}

/**
 * Props interface for BasesDiamond component
 */
export interface BasesDiamondProps {
  // Base states
  bases: {
    first: Player | null;
    second: Player | null;
    third: Player | null;
  };

  // Interaction
  interactive?: boolean;
  onBaseClick?: (base: 'first' | 'second' | 'third') => void;

  // Appearance
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;

  // Accessibility
  'aria-label'?: string;
  className?: string;
}

/**
 * BasesDiamond Component
 *
 * Displays the softball diamond with correct 4-base layout per wireframes:
 * - 2B at top
 * - 3B at left
 * - 1B at right
 * - H (Home) at bottom
 *
 * Features:
 * - Responsive design with proper aspect ratio
 * - Touch-friendly interaction targets (32px minimum)
 * - Accessibility support with screen reader announcements
 * - Visual indicators for occupied vs empty bases
 * - Player information display when bases are occupied
 *
 * @example
 * ```tsx
 * <BasesDiamond
 *   bases={{
 *     first: { id: '1', name: 'Mike Chen', jerseyNumber: '8', position: 'SS', battingOrder: 1 },
 *     second: null,
 *     third: { id: '2', name: 'Lisa Park', jerseyNumber: '5', position: 'CF', battingOrder: 2 }
 *   }}
 *   interactive={false}
 *   size="medium"
 *   showLabels={true}
 *   aria-label="Bases: Mike Chen on first, Lisa Park on third"
 * />
 * ```
 */
export const BasesDiamond: React.FC<BasesDiamondProps> = ({
  bases,
  interactive = false,
  onBaseClick,
  size = 'medium',
  showLabels = false,
  'aria-label': ariaLabel,
  className = '',
}) => {
  // Size classes for responsive design
  const sizeClasses = {
    small: 'w-48 h-48',
    medium: 'w-64 h-64',
    large: 'w-80 h-80',
  };

  // Helper function to get player display name (shortened for space)
  const getPlayerDisplayName = (player: Player): string => {
    if (!player?.name) return '';
    const nameParts = player.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0]?.[0] || ''}. ${nameParts[nameParts.length - 1] || ''}`;
    }
    return player.name;
  };

  // Helper function to handle base clicks
  const handleBaseClick = (baseKey: 'first' | 'second' | 'third'): void => {
    if (interactive && onBaseClick) {
      onBaseClick(baseKey);
    }
  };

  // Base component for individual bases
  const BaseComponent: React.FC<{
    player: Player | null;
    baseKey: 'first' | 'second' | 'third';
    label: string;
    testId: string;
    position: string;
  }> = ({ player, baseKey, label, testId, position }) => {
    const isOccupied = player !== null;
    const baseClasses = [
      'absolute',
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'min-w-8',
      'min-h-8',
      'w-12',
      'h-12',
      'rounded-lg',
      'border-2',
      'border-gray-600',
      'transition-colors',
      'duration-200',
      position,
      isOccupied ? 'bg-warning-500' : 'bg-gray-300',
      interactive ? 'cursor-pointer hover:opacity-80' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        data-testid={testId}
        className={baseClasses}
        onClick={() => handleBaseClick(baseKey)}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={
          interactive
            ? (e): void => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleBaseClick(baseKey);
                }
              }
            : undefined
        }
      >
        {showLabels && <span className="text-xs font-bold text-gray-700">{label}</span>}
        {isOccupied && player && (
          <div className="text-center">
            <div className="text-xs font-semibold text-gray-800">
              {getPlayerDisplayName(player)}
            </div>
            <div className="text-xs text-gray-600">#{player.jerseyNumber}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-testid="bases-container"
      className={`relative ${sizeClasses[size]} mx-auto ${className}`}
      style={{ aspectRatio: '1/1' }}
      role="img"
      aria-label={ariaLabel}
    >
      {/* Second Base - Top */}
      <BaseComponent
        player={bases.second}
        baseKey="second"
        label="2B"
        testId="base-2b"
        position="top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full"
      />

      {/* Third Base - Left */}
      <BaseComponent
        player={bases.third}
        baseKey="third"
        label="3B"
        testId="base-3b"
        position="top-1/2 left-0 transform -translate-y-1/2 -translate-x-1/2"
      />

      {/* First Base - Right */}
      <BaseComponent
        player={bases.first}
        baseKey="first"
        label="1B"
        testId="base-1b"
        position="top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2"
      />

      {/* Home Plate - Bottom */}
      <div
        data-testid="base-home"
        className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2
          flex flex-col items-center justify-center min-w-8 min-h-8 w-12 h-12
          rounded-lg border-2 border-gray-600 bg-gray-300 transition-colors duration-200`}
      >
        {showLabels && <span className="text-xs font-bold text-gray-700">H</span>}
      </div>

      {/* Diamond outline for visual reference */}
      <div className="absolute inset-4 border border-gray-400 transform rotate-45 pointer-events-none opacity-30" />
    </div>
  );
};
