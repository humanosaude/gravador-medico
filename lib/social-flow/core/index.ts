/**
 * Social Flow - Core Services Index
 */

export { UniversalPublisher, universalPublisher } from './publisher';
export { AnalyticsAggregator, analyticsAggregator } from './analytics-aggregator';
export { SchedulerService, schedulerService } from './scheduler';

export type {
  AggregatedMetrics,
  NetworkMetrics,
  TrendData,
  TopContent,
  BestTimeSlot,
  AudienceGrowth,
} from './analytics-aggregator';
