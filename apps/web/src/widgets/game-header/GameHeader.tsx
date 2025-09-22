import React, { useEffect, useState } from 'react';

/**
 * Props interface for GameHeader component
 */
export interface GameHeaderProps {
  // Game data
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;

  // Game status
  inning?: number;
  isTopHalf?: boolean;
  outs?: number;
  isLive?: boolean;

  // Navigation
  onBackClick?: () => void;
  onSettingsClick?: () => void;

  // Undo/Redo functionality
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;

  // State
  showBackButton?: boolean;
  compact?: boolean;

  // Accessibility
  'aria-label'?: string;
  className?: string;
}

/**
 * GameHeader Component
 *
 * Displays the game header with score, team names, and game status.
 * Fixed at the top of the screen per wireframes with always-visible score display.
 *
 * Features per wireframes:
 * - Prominent score display with team names
 * - Game status (inning, outs) when available
 * - Live game indicator
 * - Navigation buttons (back, settings)
 * - Undo/redo buttons (button-only, no swipe gestures)
 * - Responsive design for mobile-first usage
 * - Score animation on changes
 *
 * Layout per Screen 5 wireframes:
 * - HOME X - Y AWAY format
 * - Game status below (Top 3rd • 2 Outs)
 * - Settings icon in corner
 * - Undo/redo buttons inline
 *
 * @example
 * ```tsx
 * <GameHeader
 *   homeTeam="Warriors"
 *   awayTeam="Eagles"
 *   homeScore={7}
 *   awayScore={4}
 *   inning={6}
 *   isTopHalf={true}
 *   outs={2}
 *   onBackClick={handleBack}
 *   onSettingsClick={handleSettings}
 *   onUndo={handleUndo}
 *   onRedo={handleRedo}
 *   canUndo={true}
 *   canRedo={false}
 *   showBackButton={true}
 *   aria-label="Game header: Warriors 7, Eagles 4"
 * />
 * ```
 */
export const GameHeader: React.FC<GameHeaderProps> = ({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  inning,
  isTopHalf,
  outs,
  isLive = false,
  onBackClick,
  onSettingsClick,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  showBackButton = false,
  compact = false,
  'aria-label': ariaLabel,
  className = '',
}) => {
  const [animateHomeScore, setAnimateHomeScore] = useState(false);
  const [animateAwayScore, setAnimateAwayScore] = useState(false);
  const [prevHomeScore, setPrevHomeScore] = useState(homeScore);
  const [prevAwayScore, setPrevAwayScore] = useState(awayScore);

  // Animate score changes
  useEffect((): (() => void) => {
    if (homeScore !== prevHomeScore) {
      setAnimateHomeScore(true);
      setPrevHomeScore(homeScore);
      const timer = setTimeout((): void => setAnimateHomeScore(false), 1000);
      return (): void => window.clearTimeout(timer);
    }
    return (): void => {}; // Explicit return for else case
  }, [homeScore, prevHomeScore]);

  useEffect((): (() => void) => {
    if (awayScore !== prevAwayScore) {
      setAnimateAwayScore(true);
      setPrevAwayScore(awayScore);
      const timer = setTimeout((): void => setAnimateAwayScore(false), 1000);
      return (): void => window.clearTimeout(timer);
    }
    return (): void => {}; // Explicit return for else case
  }, [awayScore, prevAwayScore]);

  // Helper function to format ordinal numbers
  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return `${num}st`;
    if (j === 2 && k !== 12) return `${num}nd`;
    if (j === 3 && k !== 13) return `${num}rd`;
    return `${num}th`;
  };

  // Helper function to format outs text
  const getOutsText = (outsCount: number): string => {
    return outsCount === 1 ? '1 Out' : `${outsCount} Outs`;
  };

  // Helper function to format inning text
  const getInningText = (inningNum: number, isTop: boolean): string => {
    const ordinal = getOrdinalSuffix(inningNum);
    return `${isTop ? 'Top' : 'Bottom'} ${ordinal}`;
  };

  const headerHeight = compact ? 'h-16' : 'h-20';

  return (
    <header
      data-testid="game-header"
      className={`fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 shadow-sm ${headerHeight} ${className}`}
      role="banner"
      aria-label={ariaLabel}
    >
      <div className="flex items-center justify-between h-full px-4">
        {/* Left section - Back button */}
        <div className="flex items-center">
          {showBackButton && onBackClick && (
            <button
              onClick={onBackClick}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
              aria-label="Go back"
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Center section - Score and game status */}
        <div className="flex-1 text-center">
          {/* Score display */}
          <div className="flex items-center justify-center space-x-4">
            {/* Away team */}
            <div className="text-right">
              <div className="text-xs font-medium text-gray-500 uppercase">Away</div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-gray-800">{awayTeam}</span>
                <div
                  className={`text-2xl font-bold tabular-nums ${animateAwayScore ? 'animate-pulse' : ''}`}
                >
                  {awayScore}
                </div>
              </div>
            </div>

            {/* Score separator */}
            <div className="text-2xl font-bold text-gray-400">-</div>

            {/* Home team */}
            <div className="text-left">
              <div className="text-xs font-medium text-gray-500 uppercase">Home</div>
              <div className="flex items-center space-x-2">
                <div
                  className={`text-2xl font-bold tabular-nums ${animateHomeScore ? 'animate-pulse' : ''}`}
                >
                  {homeScore}
                </div>
                <span className="text-lg font-semibold text-gray-800">{homeTeam}</span>
              </div>
            </div>
          </div>

          {/* Game status line */}
          <div className="flex items-center justify-center space-x-4 mt-1">
            {/* Live indicator */}
            {isLive && (
              <div className="flex items-center space-x-1">
                <div
                  data-testid="live-indicator"
                  className="w-2 h-2 bg-red-500 rounded-full animate-pulse"
                />
                <span className="text-xs font-medium text-red-600 uppercase">Live</span>
              </div>
            )}

            {/* Inning and outs */}
            {inning !== undefined && isTopHalf !== undefined && (
              <span className="text-sm font-medium text-gray-600">
                {getInningText(inning, isTopHalf)}
              </span>
            )}

            {outs !== undefined && (
              <span className="text-sm font-medium text-gray-600">{getOutsText(outs)}</span>
            )}

            {/* Undo/Redo buttons */}
            {(onUndo || onRedo) && (
              <div className="flex items-center space-x-1">
                {onUndo && (
                  <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Undo last action"
                    type="button"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                      />
                    </svg>
                  </button>
                )}

                {onRedo && (
                  <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Redo last action"
                    type="button"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right section - Settings button */}
        <div className="flex items-center">
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
              aria-label="Open settings"
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
