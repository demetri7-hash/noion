/**
 * Feature Flags for Employee Management System
 *
 * Controls gradual rollout of new features.
 * Set environment variables to enable/disable features.
 *
 * Usage:
 *   import { FEATURE_FLAGS } from '@/lib/featureFlags';
 *   if (FEATURE_FLAGS.EMPLOYEE_MANAGEMENT) { ... }
 */

export const FEATURE_FLAGS = {
  // User Management & RBAC
  EMPLOYEE_MANAGEMENT: process.env.NEXT_PUBLIC_ENABLE_EMPLOYEE_MGMT === 'true',

  // Chat System
  CHAT_SYSTEM: process.env.NEXT_PUBLIC_ENABLE_CHAT === 'true',

  // Task & Workflow Management
  TASK_WORKFLOWS: process.env.NEXT_PUBLIC_ENABLE_WORKFLOWS === 'true',

  // Gamification (Points, Badges, Leaderboards)
  GAMIFICATION: process.env.NEXT_PUBLIC_ENABLE_GAMIFICATION === 'true',

  // Role-based Analytics Dashboards
  ROLE_DASHBOARDS: process.env.NEXT_PUBLIC_ENABLE_ROLE_DASHBOARDS === 'true',
} as const;

/**
 * Server-side feature flags (no NEXT_PUBLIC prefix)
 * Use these in API routes and server components
 */
export const SERVER_FEATURE_FLAGS = {
  EMPLOYEE_MANAGEMENT: process.env.ENABLE_EMPLOYEE_MGMT === 'true',
  CHAT_SYSTEM: process.env.ENABLE_CHAT === 'true',
  TASK_WORKFLOWS: process.env.ENABLE_WORKFLOWS === 'true',
  GAMIFICATION: process.env.ENABLE_GAMIFICATION === 'true',
  ROLE_DASHBOARDS: process.env.ENABLE_ROLE_DASHBOARDS === 'true',
} as const;

/**
 * Check if a feature is enabled
 * @param feature - Feature name
 * @returns boolean
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}

/**
 * Check if server feature is enabled
 * @param feature - Feature name
 * @returns boolean
 */
export function isServerFeatureEnabled(feature: keyof typeof SERVER_FEATURE_FLAGS): boolean {
  return SERVER_FEATURE_FLAGS[feature];
}

/**
 * Get all enabled features
 * @returns Array of enabled feature names
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature);
}

// Export types for TypeScript
export type FeatureFlag = keyof typeof FEATURE_FLAGS;
export type ServerFeatureFlag = keyof typeof SERVER_FEATURE_FLAGS;
