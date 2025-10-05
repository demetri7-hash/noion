"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.policies = exports.roleInheritance = void 0;
exports.getAllPolicies = getAllPolicies;
exports.roleHasDirectPermission = roleHasDirectPermission;
exports.getRolePermissions = getRolePermissions;
const Restaurant_1 = require("../../models/Restaurant");
/**
 * Role inheritance (g = role, inherited_role)
 * Higher roles inherit permissions from lower roles
 */
exports.roleInheritance = [
    // Owner inherits all admin permissions
    [Restaurant_1.UserRole.OWNER, Restaurant_1.UserRole.ADMIN],
    // Admin inherits all manager permissions
    [Restaurant_1.UserRole.ADMIN, Restaurant_1.UserRole.MANAGER],
    // Manager inherits all employee permissions
    [Restaurant_1.UserRole.MANAGER, Restaurant_1.UserRole.EMPLOYEE],
    // Legacy role mappings (for backwards compatibility)
    ['restaurant_owner', Restaurant_1.UserRole.OWNER], // Legacy owner = Owner
    ['restaurant_manager', Restaurant_1.UserRole.MANAGER], // Legacy manager = Manager
    ['restaurant_staff', Restaurant_1.UserRole.EMPLOYEE], // Legacy staff = Employee
];
/**
 * Permission policies (p = role, resource, action)
 * Format: [role, resource, action]
 */
exports.policies = [
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
    [Restaurant_1.UserRole.EMPLOYEE, 'profile:own', 'read'],
    [Restaurant_1.UserRole.EMPLOYEE, 'profile:own', 'update'],
    // Own Analytics
    [Restaurant_1.UserRole.EMPLOYEE, 'analytics:own', 'read'],
    // Own Tasks
    [Restaurant_1.UserRole.EMPLOYEE, 'tasks:own', 'read'],
    [Restaurant_1.UserRole.EMPLOYEE, 'tasks:own', 'complete'],
    [Restaurant_1.UserRole.EMPLOYEE, 'tasks:own', 'update'],
    // Chat (own messages)
    [Restaurant_1.UserRole.EMPLOYEE, 'chat', 'read'],
    [Restaurant_1.UserRole.EMPLOYEE, 'chat', 'write'],
    [Restaurant_1.UserRole.EMPLOYEE, 'chat:messages', 'read'],
    [Restaurant_1.UserRole.EMPLOYEE, 'chat:messages', 'create'],
    [Restaurant_1.UserRole.EMPLOYEE, 'chat:channels', 'read'],
    // Gamification (own stats)
    [Restaurant_1.UserRole.EMPLOYEE, 'gamification:own', 'read'],
    [Restaurant_1.UserRole.EMPLOYEE, 'leaderboard:all', 'read'],
    // ============================================
    // MANAGER PERMISSIONS (Inherits Employee)
    // ============================================
    // Team Management
    [Restaurant_1.UserRole.MANAGER, 'users:team', 'read'],
    [Restaurant_1.UserRole.MANAGER, 'users:team', 'update'],
    // Team Analytics
    [Restaurant_1.UserRole.MANAGER, 'analytics:team', 'read'],
    // Task Management
    [Restaurant_1.UserRole.MANAGER, 'tasks:team', 'read'],
    [Restaurant_1.UserRole.MANAGER, 'tasks:team', 'create'],
    [Restaurant_1.UserRole.MANAGER, 'tasks:team', 'assign'],
    [Restaurant_1.UserRole.MANAGER, 'tasks:team', 'update'],
    // Workflow Templates
    [Restaurant_1.UserRole.MANAGER, 'workflows:templates', 'read'],
    [Restaurant_1.UserRole.MANAGER, 'workflows:templates', 'create'],
    [Restaurant_1.UserRole.MANAGER, 'workflows:templates', 'update'],
    // Workflows (team)
    [Restaurant_1.UserRole.MANAGER, 'workflows:team', 'read'],
    [Restaurant_1.UserRole.MANAGER, 'workflows:team', 'create'],
    [Restaurant_1.UserRole.MANAGER, 'workflows:team', 'update'],
    // Chat (team channels)
    [Restaurant_1.UserRole.MANAGER, 'chat:channels', 'create'],
    [Restaurant_1.UserRole.MANAGER, 'chat:channels', 'update'],
    [Restaurant_1.UserRole.MANAGER, 'chat:announcements', 'create'],
    // ============================================
    // ADMIN PERMISSIONS (Inherits Manager)
    // ============================================
    // User Management (all users)
    [Restaurant_1.UserRole.ADMIN, 'users:all', 'read'],
    [Restaurant_1.UserRole.ADMIN, 'users:all', 'create'],
    [Restaurant_1.UserRole.ADMIN, 'users:all', 'update'],
    [Restaurant_1.UserRole.ADMIN, 'users:all', 'delete'],
    // Restaurant Settings
    [Restaurant_1.UserRole.ADMIN, 'restaurant:settings', 'read'],
    [Restaurant_1.UserRole.ADMIN, 'restaurant:settings', 'update'],
    // All Analytics
    [Restaurant_1.UserRole.ADMIN, 'analytics:all', 'read'],
    // All Tasks & Workflows
    [Restaurant_1.UserRole.ADMIN, 'tasks:all', 'read'],
    [Restaurant_1.UserRole.ADMIN, 'tasks:all', 'update'],
    [Restaurant_1.UserRole.ADMIN, 'tasks:all', 'delete'],
    [Restaurant_1.UserRole.ADMIN, 'workflows:all', 'read'],
    [Restaurant_1.UserRole.ADMIN, 'workflows:all', 'update'],
    [Restaurant_1.UserRole.ADMIN, 'workflows:all', 'delete'],
    // POS Integration
    [Restaurant_1.UserRole.ADMIN, 'pos:integration', 'read'],
    [Restaurant_1.UserRole.ADMIN, 'pos:integration', 'update'],
    [Restaurant_1.UserRole.ADMIN, 'pos:manage', 'read'],
    [Restaurant_1.UserRole.ADMIN, 'pos:manage', 'create'],
    [Restaurant_1.UserRole.ADMIN, 'pos:manage', 'update'],
    [Restaurant_1.UserRole.ADMIN, 'pos:manage', 'delete'],
    // Billing & Subscription
    [Restaurant_1.UserRole.ADMIN, 'billing:restaurant', 'read'],
    [Restaurant_1.UserRole.ADMIN, 'billing:restaurant', 'update'],
    // ============================================
    // OWNER PERMISSIONS (Inherits Admin + Special)
    // ============================================
    // Full ownership permissions
    [Restaurant_1.UserRole.OWNER, 'restaurant:ownership', 'transfer'],
    [Restaurant_1.UserRole.OWNER, 'restaurant:delete', 'delete'],
    [Restaurant_1.UserRole.OWNER, 'users:admin', 'create'], // Can create admins
    [Restaurant_1.UserRole.OWNER, 'users:admin', 'delete'], // Can remove admins
    [Restaurant_1.UserRole.OWNER, 'audit:logs', 'read'], // Can view audit logs
    [Restaurant_1.UserRole.OWNER, 'system:config', 'update'], // Can configure system settings
];
/**
 * Get all policies for Casbin enforcer
 * @returns Array of policies and role inheritance
 */
function getAllPolicies() {
    return {
        policies: exports.policies,
        roleInheritance: exports.roleInheritance,
    };
}
/**
 * Check if a role has a specific permission
 * Helper function for quick checks without Casbin
 *
 * Note: This is a simple check. Use Casbin enforcer for inheritance checks.
 */
function roleHasDirectPermission(role, resource, action) {
    return exports.policies.some(([pRole, pResource, pAction]) => pRole === role && pResource === resource && pAction === action);
}
/**
 * Get all permissions for a specific role (direct only, not inherited)
 */
function getRolePermissions(role) {
    return exports.policies
        .filter(([pRole]) => pRole === role)
        .map(([, resource, action]) => ({ resource, action }));
}
