import { type ReactElement } from 'react';
import { Link } from 'react-router-dom';

/**
 * 404 Not Found page component for TW Softball PWA
 *
 * Provides a user-friendly error page when users navigate to invalid routes.
 * Includes navigation back to home and maintains PWA design consistency.
 */
export const NotFoundPage = (): ReactElement => {
  return (
    <div data-testid="not-found-page" className="text-center py-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
      <h2 className="text-xl font-semibold text-gray-600 mb-4">Page Not Found</h2>
      <p className="text-gray-500 mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-block bg-field-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-field-green-700 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
};
