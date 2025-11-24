import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';

export type WebVitalsMetric = Metric;

export interface WebVitalsReporter {
  (metric: WebVitalsMetric): void;
}

/**
 * Initialize Web Vitals tracking.
 * Reports Core Web Vitals: LCP, FCP, CLS, TTFB, INP.
 *
 * @param onReport - Callback function to receive metrics
 *
 * @remarks
 * - LCP (Largest Contentful Paint): measures loading performance
 * - FCP (First Contentful Paint): measures perceived load speed
 * - CLS (Cumulative Layout Shift): measures visual stability
 * - TTFB (Time to First Byte): measures server response time
 * - INP (Interaction to Next Paint): measures responsiveness (replaces FID)
 */
export function initWebVitals(onReport: WebVitalsReporter): void {
  onCLS(onReport);
  onFCP(onReport);
  onLCP(onReport);
  onTTFB(onReport);
  onINP(onReport);
}

/**
 * Default reporter for development - logs metrics to console.
 *
 * @param metric - The Web Vitals metric to report
 */
export function consoleReporter(metric: WebVitalsMetric): void {
  // eslint-disable-next-line no-console -- Intentional: console reporter logs to console
  console.log(`[Web Vitals] ${metric.name}:`, {
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
  });
}
