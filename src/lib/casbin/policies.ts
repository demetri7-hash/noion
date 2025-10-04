/**
 * Casbin Policy Definitions for NOION Employee Management
 *
 * Role Hierarchy:
 *   Owner > Admin > Manager > Employee
 *
 * Permissions:
 *   - owner: Full access to everything
 *   - admin: Manage users, view all data, configure system
 *   - manager: Manage team, assign tasks, view team data
 *   - employee: View own data, complete tasks, use chat
 */

import { UserRole } from '@/models/Restaurant';

/**
 * Role inheritance (g = role, inherited_role)
 * Higher roles inherit permissions from lower roles
 */
export const roleInheritance = [
  // Owner inherits all admin permissions
  [UserRole.OWNER, UserRole.ADMIN],

  // Admin inherits all manager permissions
  [UserRole.ADMIN, UserRole.MANAGER],

  // Manager inherits all employee permissions
  [UserRole.MANAGER, UserRole.EMPLOYEE],

  // Legacy role mappings (for backwards compatibility)
  ['restaurant_owner', UserRole.OWNER],  // Legacy owner = Owner
  ['restaurant_manager', UserRole.MANAGER],  // Legacy manager = Manager
  ['restaurant_staff', UserRole.EMPLOYEE],  // Legacy staff = Employee
];

/**
 * Permission policies (p = role, resource, action)
 * Format: [role, resource, action]
 */
export const policies = [
  // ============================================
  // LEGACY ROLE PERMISSIONS (Direct mappings for backwards compatibility)
  // ============================================

  // Legacy restaurant_owner gets all owner permissions
  ['restaurant_owner', 'pos:manage', 'read'],
  ['restaurant_owner', 'pos:manage', 'create'],
  ['restaurant_owner', 'pos:manage', 'update'],
  ['restaurant_owner', 'pos:manage', 'delete'],
  ['restaurant_owner', 'users:all', 'read'],
  ['restaurant_owner', 'users:all', 'create'],
  ['restaurant_owner', 'users:all', 'update'],
  ['restaurant_owner', 'users:all', 'delete'],
  ['restaurant_owner', 'analytics:all', 'read'],
  ['restaurant_owner', 'restaurant:settings', 'read'],
  ['restaurant_owner', 'restaurant:settings', 'update'],

  // ============================================
  // EMPLOYEE PERMISSIONS (Base Level)
  // ============================================

  // Own Profile
  [UserRole.EMPLOYEE, 'profile:own', 'read'],
  [UserRole.EMPLOYEE, 'profile:own', 'update'],

  // Own Analytics
  [UserRole.EMPLOYEE, 'analytics:own', 'read'],

  // Own Tasks
  [UserRole.EMPLOYEE, 'tasks:own', 'read'],
  [UserRole.EMPLOYEE, 'tasks:own', 'complete'],
  [UserRole.EMPLOYEE, 'tasks:own', 'update'],

  // Chat (own messages)
  [UserRole.EMPLOYEE, 'chat', 'read'],
  [UserRole.EMPLOYEE, 'chat', 'write'],
  [UserRole.EMPLOYEE, 'chat:messages', 'read'],
  [UserRole.EMPLOYEE, 'chat:messages', 'create'],
  [UserRole.EMPLOYEE, 'chat:channels', 'read'],

  // Gamification (own stats)
  [UserRole.EMPLOYEE, 'gamification:own', 'read'],
  [UserRole.EMPLOYEE, 'leaderboard:all', 'read'],

  // ============================================
  // MANAGER PERMISSIONS (Inherits Employee)
  // ============================================

  // Team Management
  [UserRole.MANAGER, 'users:team', 'read'],
  [UserRole.MANAGER, 'users:team', 'update'],

  // Team Analytics
  [UserRole.MANAGER, 'analytics:team', 'read'],

  // Task Management
  [UserRole.MANAGER, 'tasks:team', 'read'],
  [UserRole.MANAGER, 'tasks:team', 'create'],
  [UserRole.MANAGER, 'tasks:team', 'assign'],
  [UserRole.MANAGER, 'tasks:team', 'update'],

  // Workflow Templates
  [UserRole.MANAGER, 'workflows:templates', 'read'],
  [UserRole.MANAGER, 'workflows:templates', 'create'],
  [UserRole.MANAGER, 'workflows:templates', 'update'],

  // Workflows (team)
  [UserRole.MANAGER, 'workflows:team', 'read'],
  [UserRole.MANAGER, 'workflows:team', 'create'],
  [UserRole.MANAGER, 'workflows:team', 'update'],

  // Chat (team channels)
  [UserRole.MANAGER, 'chat:channels', 'create'],
  [UserRole.MANAGER, 'chat:channels', 'update'],
  [UserRole.MANAGER, 'chat:announcements', 'create'],

  // ============================================
  // ADMIN PERMISSIONS (Inherits Manager)
  // ============================================

  // User Management (all users)
  [UserRole.ADMIN, 'users:all', 'read'],
  [UserRole.ADMIN, 'users:all', 'create'],
  [UserRole.ADMIN, 'users:all', 'update'],
  [UserRole.ADMIN, 'users:all', 'delete'],

  // Restaurant Settings
  [UserRole.ADMIN, 'restaurant:settings', 'read'],
  [UserRole.ADMIN, 'restaurant:settings', 'update'],

  // All Analytics
  [UserRole.ADMIN, 'analytics:all', 'read'],

  // All Tasks & Workflows
  [UserRole.ADMIN, 'tasks:all', 'read'],
  [UserRole.ADMIN, 'tasks:all', 'update'],
  [UserRole.ADMIN, 'tasks:all', 'delete'],
  [UserRole.ADMIN, 'workflows:all', 'read'],
  [UserRole.ADMIN, 'workflows:all', 'update'],
  [UserRole.ADMIN, 'workflows:all', 'delete'],

  // POS Integration
  [UserRole.ADMIN, 'pos:integration', 'read'],
  [UserRole.ADMIN, 'pos:integration', 'update'],
  [UserRole.ADMIN, 'pos:manage', 'read'],
  [UserRole.ADMIN, 'pos:manage', 'create'],
  [UserRole.ADMIN, 'pos:manage', 'update'],
  [UserRole.ADMIN, 'pos:manage', 'delete'],

  // Billing & Subscription
  [UserRole.ADMIN, 'billing:restaurant', 'read'],
  [UserRole.ADMIN, 'billing:restaurant', 'update'],

  // ============================================
  // OWNER PERMISSIONS (Inherits Admin + Special)
  // ============================================

  // Full ownership permissions
  [UserRole.OWNER, 'restaurant:ownership', 'transfer'],
  [UserRole.OWNER, 'restaurant:delete', 'delete'],
  [UserRole.OWNER, 'users:admin', 'create'],   // Can create admins
  [UserRole.OWNER, 'users:admin', 'delete'],   // Can remove admins
  [UserRole.OWNER, 'audit:logs', 'read'],      // Can view audit logs
  [UserRole.OWNER, 'system:config', 'update'], // Can configure system settings
];

/**
 * Get all policies for Casbin enforcer
 * @returns Array of policies and role inheritance
 */
export function getAllPolicies(): { policies: string[][], roleInheritance: string[][] } {
  return {
    policies,
    roleInheritance,
  };
}

/**
 * Check if a role has a specific permission
 * Helper function for quick checks without Casbin
 *
 * Note: This is a simple check. Use Casbin enforcer for inheritance checks.
 */
export function roleHasDirectPermission(role: UserRole, resource: string, action: string): boolean {
  return policies.some(
    ([pRole, pResource, pAction]) =>
      pRole === role && pResource === resource && pAction === action
  );
}

/**
 * Get all permissions for a specific role (direct only, not inherited)
 */
export function getRolePermissions(role: UserRole): Array<{ resource: string; action: string }> {
  return policies
    .filter(([pRole]) => pRole === role)
    .map(([, resource, action]) => ({ resource, action }));
}
