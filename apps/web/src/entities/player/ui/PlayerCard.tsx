import React from 'react';

/**
 * Player status types
 */
export type PlayerStatus = 'available' | 'batting' | 'on-base' | 'substituted';

/**
 * Props interface for PlayerCard component
 */
export interface PlayerCardProps {
  // Player data
  player: {
    id: string;
    name: string;
    jerseyNumber: string;
    position: string;
    battingOrder: number;
    battingAverage?: number;
    atBats?: number;
    hits?: number;
  };

  // State
  isActive?: boolean;
  status?: PlayerStatus;
  isDragging?: boolean;
  isDropTarget?: boolean;
  hasPositionConflict?: boolean;

  // Drag and drop
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;

  // Actions
  onClick?: (playerId: string) => void;
  onSubstitute?: (playerId: string) => void;

  // Appearance
  showStats?: boolean;
  showBattingOrder?: boolean;
  compact?: boolean;

  // Accessibility
  'aria-label'?: string;
  className?: string;
}

/**
 * PlayerCard Component
 *
 * Displays player information with drag-and-drop functionality for lineup management.
 * Follows wireframes specifications for Screen 3 lineup setup with enhanced
 * touch targets and mobile-first design.
 *
 * Features per wireframes:
 * - Player name, jersey number, and position
 * - Drag handle with 60px width for easier grabbing
 * - Status indicators (batting, on base, available, substituted)
 * - Optional stats display (batting average, hits/at-bats)
 * - Position conflict detection and visual feedback
 * - Touch-friendly 48px minimum height
 * - Keyboard accessibility for drag operations
 * - Responsive design for different screen sizes
 *
 * Drag behaviors per specifications:
 * - Drag from Available → Empty slot: Assigns to batting order
 * - Drag from Available → Occupied slot: Swaps positions
 * - Drag within Batting Order: Reorders players
 * - Drag from Batting Order → Available: Removes from lineup
 *
 * @example
 * ```tsx
 * <PlayerCard
 *   player={{
 *     id: '1',
 *     name: 'Sarah Johnson',
 *     jerseyNumber: '12',
 *     position: 'RF',
 *     battingOrder: 4,
 *     battingAverage: 0.333,
 *     atBats: 3,
 *     hits: 1
 *   }}
 *   isActive={true}
 *   status="batting"
 *   draggable={true}
 *   showStats={true}
 *   showBattingOrder={true}
 *   onClick={handlePlayerClick}
 *   onDragStart={handleDragStart}
 * />
 * ```
 */
export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isActive = false,
  status,
  isDragging = false,
  isDropTarget = false,
  hasPositionConflict = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onClick,
  onSubstitute,
  showStats = false,
  showBattingOrder = false,
  compact = false,
  'aria-label': ariaLabel,
  className = '',
}) => {
  // Helper function to get ordinal suffix for batting order
  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return `${num}st`;
    if (j === 2 && k !== 12) return `${num}nd`;
    if (j === 3 && k !== 13) return `${num}rd`;
    return `${num}th`;
  };

  // Helper function to get status display
  const getStatusDisplay = (playerStatus: PlayerStatus): string => {
    switch (playerStatus) {
      case 'batting':
        return 'BATTING';
      case 'on-base':
        return 'ON BASE';
      case 'substituted':
        return 'SUBSTITUTED';
      case 'available':
      default:
        return 'AVAILABLE';
    }
  };

  // Helper function to get status color
  const getStatusColor = (playerStatus: PlayerStatus): string => {
    switch (playerStatus) {
      case 'batting':
        return 'text-blue-600 bg-blue-50';
      case 'on-base':
        return 'text-green-600 bg-green-50';
      case 'substituted':
        return 'text-gray-600 bg-gray-50';
      case 'available':
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Build card classes based on state
  const cardClasses = [
    'relative',
    'flex',
    'items-center',
    'min-h-12', // 48px minimum touch target
    compact ? 'p-2' : 'p-3',
    'bg-white',
    'border',
    'border-gray-200',
    'rounded-lg',
    'transition-all',
    'duration-200',
    'cursor-pointer',
  ];

  // Add state-specific classes
  if (isActive) {
    cardClasses.push('ring-2', 'ring-blue-500', 'border-blue-200');
  }

  if (hasPositionConflict) {
    cardClasses.push('ring-2', 'ring-red-500', 'border-red-200');
  }

  if (isDropTarget) {
    cardClasses.push('ring-2', 'ring-dashed', 'ring-blue-400', 'bg-blue-50');
  }

  if (isDragging) {
    cardClasses.push('opacity-50', 'transform', 'scale-95');
  }

  if (draggable) {
    cardClasses.push('hover:shadow-md', 'hover:border-gray-300');
  }

  // Handle card click
  const handleClick = (): void => {
    if (onClick && !isDragging) {
      onClick(player.id);
    }
  };

  // Handle substitute button click
  const handleSubstitute = (event: React.MouseEvent): void => {
    event.stopPropagation();
    if (onSubstitute) {
      onSubstitute(player.id);
    }
  };

  // Handle keyboard events for accessibility
  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      data-testid="player-card"
      className={`${cardClasses.join(' ')} ${className}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={draggable ? 0 : undefined}
      role={draggable ? 'button' : undefined}
      aria-label={ariaLabel || `Player card for ${player.name}`}
    >
      {/* Drag handle */}
      {draggable && (
        <div
          data-testid="drag-handle"
          className="flex items-center justify-center mr-3 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          style={{ width: '60px' }}
          aria-label="Drag handle"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
      )}

      {/* Player content */}
      <div className="flex-1 min-w-0">
        {/* Top row - Name and jersey */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              #{player.jerseyNumber} {player.name}
            </h3>
            {showBattingOrder && (
              <span className="text-sm font-medium text-gray-600">
                {getOrdinalSuffix(player.battingOrder)}
              </span>
            )}
          </div>

          {/* Position */}
          <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
            {player.position}
          </span>
        </div>

        {/* Bottom row - Status and stats */}
        <div className="flex items-center justify-between mt-1">
          {/* Status */}
          {status && (
            <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(status)}`}>
              {getStatusDisplay(status)}
            </span>
          )}

          {/* Position conflict indicator */}
          {hasPositionConflict && (
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
              CONFLICT
            </span>
          )}

          {/* Stats */}
          {showStats &&
            player.battingAverage !== undefined &&
            player.atBats !== undefined &&
            player.hits !== undefined && (
              <div className="text-xs text-gray-600 space-x-2">
                <span>
                  {player.hits}-{player.atBats}
                </span>
                <span>•</span>
                <span>{player.battingAverage.toFixed(3)}</span>
              </div>
            )}
        </div>
      </div>

      {/* Actions */}
      {onSubstitute && (
        <button
          onClick={handleSubstitute}
          className="ml-2 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
          aria-label={`Substitute ${player.name}`}
        >
          SUBSTITUTE
        </button>
      )}
    </div>
  );
};
