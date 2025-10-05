"use strict";
/**
 * Feature Flags for Employee Management System
 *
 * Controls gradual rollout of new features.
 * Set environment variables to enable/disable features.
 *
 * Usage:
 *   import { FEATURE_FLAGS } from './featureFlags';
 *   if (FEATURE_FLAGS.EMPLOYEE_MANAGEMENT) { ... }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVER_FEATURE_FLAGS = exports.FEATURE_FLAGS = void 0;
exports.isFeatureEnabled = isFeatureEnabled;
exports.isServerFeatureEnabled = isServerFeatureEnabled;
exports.getEnabledFeatures = getEnabledFeatures;
exports.FEATURE_FLAGS = {
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
};
/**
 * Server-side feature flags (no NEXT_PUBLIC prefix)
 * Use these in API routes and server components
 */
exports.SERVER_FEATURE_FLAGS = {
    EMPLOYEE_MANAGEMENT: process.env.ENABLE_EMPLOYEE_MGMT === 'true',
    CHAT_SYSTEM: process.env.ENABLE_CHAT === 'true',
    TASK_WORKFLOWS: process.env.ENABLE_WORKFLOWS === 'true',
    GAMIFICATION: process.env.ENABLE_GAMIFICATION === 'true',
    ROLE_DASHBOARDS: process.env.ENABLE_ROLE_DASHBOARDS === 'true',
};
/**
 * Check if a feature is enabled
 * @param feature - Feature name
 * @returns boolean
 */
function isFeatureEnabled(feature) {
    return exports.FEATURE_FLAGS[feature];
}
/**
 * Check if server feature is enabled
 * @param feature - Feature name
 * @returns boolean
 */
function isServerFeatureEnabled(feature) {
    return exports.SERVER_FEATURE_FLAGS[feature];
}
/**
 * Get all enabled features
 * @returns Array of enabled feature names
 */
function getEnabledFeatures() {
    return Object.entries(exports.FEATURE_FLAGS)
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature);
}
