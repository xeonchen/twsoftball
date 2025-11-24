import React, {
  useEffect,
  useRef,
  useCallback,
  type ReactElement,
  type KeyboardEvent,
} from 'react';

import { cn } from '../../lib/utils';

/**
 * Props for the NavigationConfirmDialog component
 */
export interface NavigationConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when user confirms leaving the page */
  onConfirm: () => void;
  /** Callback when user cancels and stays on the page */
  onCancel: () => void;
  /** Custom title for the dialog */
  title?: string;
  /** Custom message for the dialog */
  message?: string;
}

/**
 * Navigation Confirm Dialog Component
 *
 * A modal dialog that prevents accidental navigation during active games.
 * Implements proper accessibility with ARIA attributes, keyboard navigation,
 * and focus management.
 *
 * Features:
 * - Accessible dialog with proper ARIA attributes
 * - Keyboard support (Escape to cancel)
 * - Focus trap when open
 * - Backdrop click to cancel
 * - Mobile-friendly touch targets
 *
 * @example
 * ```tsx
 * <NavigationConfirmDialog
 *   isOpen={showWarning}
 *   onConfirm={() => navigate('/')}
 *   onCancel={() => setShowWarning(false)}
 *   title="Game in Progress"
 *   message="Your progress will be saved. Continue?"
 * />
 * ```
 */
export function NavigationConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Unsaved Changes',
  message = 'You have unsaved changes. Are you sure you want to leave?',
}: NavigationConfirmDialogProps): ReactElement | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const stayButtonRef = useRef<HTMLButtonElement>(null);
  const leaveButtonRef = useRef<HTMLButtonElement>(null);

  // Generate unique IDs for accessibility
  const titleId = 'navigation-dialog-title';
  const descriptionId = 'navigation-dialog-description';

  /**
   * Handle keyboard events for the dialog
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key === 'Escape') {
        onCancel();
        return;
      }

      // Focus trap implementation
      if (event.key === 'Tab') {
        const focusableElements = [stayButtonRef.current, leaveButtonRef.current].filter(
          Boolean
        ) as HTMLButtonElement[];

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift+Tab: if on first element, go to last
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab: if on last element, go to first
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    },
    [onCancel]
  );

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>): void => {
      // Only close if clicking the backdrop itself, not the dialog content
      if (event.target === event.currentTarget) {
        onCancel();
      }
    },
    [onCancel]
  );

  // Focus the Stay button when dialog opens
  useEffect(() => {
    if (isOpen && stayButtonRef.current) {
      stayButtonRef.current.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return (): void => {
        document.body.style.overflow = originalOverflow;
      };
    }
    return;
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="navigation-dialog-backdrop"
      onClick={handleBackdropClick}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKeyDown}
        className={cn(
          'bg-white rounded-lg shadow-xl max-w-md w-full mx-4',
          'p-6 transform transition-all',
          'focus:outline-none'
        )}
      >
        {/* Dialog Header */}
        <h2 id={titleId} className="text-xl font-semibold text-gray-900 mb-4">
          {title}
        </h2>

        {/* Dialog Message */}
        <p id={descriptionId} className="text-gray-600 mb-6">
          {message}
        </p>

        {/* Dialog Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            ref={leaveButtonRef}
            type="button"
            onClick={onConfirm}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              'bg-red-600 hover:bg-red-700 text-white',
              'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
              'min-h-[44px]' // Touch target
            )}
            aria-label="Leave this page"
          >
            Leave
          </button>
          <button
            ref={stayButtonRef}
            type="button"
            onClick={onCancel}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              'bg-field-green-600 hover:bg-field-green-700 text-white',
              'focus:outline-none focus:ring-2 focus:ring-field-green-500 focus:ring-offset-2',
              'min-h-[44px]' // Touch target
            )}
            aria-label="Stay on this page"
          >
            Stay
          </button>
        </div>
      </div>
    </div>
  );
}
