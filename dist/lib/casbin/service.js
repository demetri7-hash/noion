"use strict";
/**
 * Casbin Authorization Service
 *
 * Provides centralized permission checking for NOION Employee Management
 * Uses Casbin RBAC with role inheritance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.casbinService = void 0;
const casbin_1 = require("casbin");
const policies_1 = require("./policies");
/**
 * Casbin Enforcer Singleton
 */
class CasbinService {
    constructor() {
        this.enforcer = null;
        this.initializePromise = null;
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!CasbinService.instance) {
            CasbinService.instance = new CasbinService();
        }
        return CasbinService.instance;
    }
    /**
     * Initialize Casbin enforcer with model and policies
     */
    async initialize() {
        // If already initialized, return existing enforcer
        if (this.enforcer) {
            return this.enforcer;
        }
        // If initialization is in progress, wait for it
        if (this.initializePromise) {
            return this.initializePromise;
        }
        // Start initialization
        this.initializePromise = this._doInitialize();
        this.enforcer = await this.initializePromise;
        this.initializePromise = null;
        return this.enforcer;
    }
    /**
     * Actual initialization logic
     */
    async _doInitialize() {
        try {
            // Inline model definition (works better in serverless environments like Vercel)
            const modelText = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
`;
            // Load policies
            const { policies, roleInheritance } = (0, policies_1.getAllPolicies)();
            // Build policy string for StringAdapter
            let policyText = '';
            // Add policies
            for (const policy of policies) {
                policyText += `p, ${policy.join(', ')}\n`;
            }
            // Add role inheritance
            for (const grouping of roleInheritance) {
                policyText += `g, ${grouping.join(', ')}\n`;
            }
            // Create model from string
            const model = (0, casbin_1.newModelFromString)(modelText);
            // Create adapter from policy string
            const adapter = new casbin_1.StringAdapter(policyText);
            // Create enforcer with model and string adapter
            const enforcer = await (0, casbin_1.newEnforcer)(model, adapter);
            console.log('✅ Casbin enforcer initialized with', policies.length, 'policies');
            return enforcer;
        }
        catch (error) {
            console.error('❌ Failed to initialize Casbin enforcer:', error);
            throw error;
        }
    }
    /**
     * Get enforcer (initialize if needed)
     */
    async getEnforcer() {
        if (!this.enforcer) {
            return this.initialize();
        }
        return this.enforcer;
    }
    /**
     * Check if user has permission
     *
     * @param userId - User identifier
     * @param role - User role
     * @param resource - Resource being accessed
     * @param action - Action being performed
     * @returns Promise<boolean>
     */
    async can(userId, role, resource, action) {
        try {
            const enforcer = await this.getEnforcer();
            // Casbin enforce check
            // Checks: Does this role have permission for this resource+action?
            const allowed = await enforcer.enforce(role, resource, action);
            if (!allowed) {
                console.log(`🚫 Permission denied: ${role} cannot ${action} on ${resource}`);
            }
            return allowed;
        }
        catch (error) {
            console.error('❌ Permission check error:', error);
            return false; // Fail closed
        }
    }
    /**
     * Check if user has ANY of the given permissions
     */
    async canAny(userId, role, permissions) {
        for (const { resource, action } of permissions) {
            const allowed = await this.can(userId, role, resource, action);
            if (allowed) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if user has ALL of the given permissions
     */
    async canAll(userId, role, permissions) {
        for (const { resource, action } of permissions) {
            const allowed = await this.can(userId, role, resource, action);
            if (!allowed) {
                return false;
            }
        }
        return true;
    }
    /**
     * Get all permissions for a role (including inherited)
     */
    async getRolePermissions(role) {
        try {
            const enforcer = await this.getEnforcer();
            return enforcer.getFilteredPolicy(0, role);
        }
        catch (error) {
            console.error('❌ Get role permissions error:', error);
            return [];
        }
    }
    /**
     * Get all roles a user has (including inherited)
     */
    async getUserRoles(userId, role) {
        try {
            const enforcer = await this.getEnforcer();
            const roles = await enforcer.getRolesForUser(role);
            return [role, ...roles];
        }
        catch (error) {
            console.error('❌ Get user roles error:', error);
            return [role];
        }
    }
    /**
     * Add a custom permission for a user (override/extend role permissions)
     */
    async addUserPermission(userId, role, resource, action) {
        try {
            const enforcer = await this.getEnforcer();
            return enforcer.addPolicy(role, resource, action);
        }
        catch (error) {
            console.error('❌ Add user permission error:', error);
            return false;
        }
    }
    /**
     * Remove a custom permission from a user
     */
    async removeUserPermission(userId, role, resource, action) {
        try {
            const enforcer = await this.getEnforcer();
            return enforcer.removePolicy(role, resource, action);
        }
        catch (error) {
            console.error('❌ Remove user permission error:', error);
            return false;
        }
    }
    /**
     * Reset enforcer (useful for testing or policy updates)
     */
    async reset() {
        this.enforcer = null;
        this.initializePromise = null;
    }
}
// Export singleton instance
exports.casbinService = CasbinService.getInstance();
