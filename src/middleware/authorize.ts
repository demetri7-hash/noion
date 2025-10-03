/**
 * Authorization Middleware for NOION Employee Management
 *
 * Protects API routes with Casbin RBAC
 * Checks if authenticated user has permission to perform action
 */

import { NextRequest, NextResponse } from 'next/server';
import { casbinService } from '@/lib/casbin/service';
import { UserRole } from '@/models/Restaurant';
import * as jwt from 'jsonwebtoken';

/**
 * JWT Payload Interface
 */
interface IJwtPayload {
  userId: string;
  restaurantId: string;
  role: UserRole | string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Extract JWT token from Authorization header
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer TOKEN" and just "TOKEN"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token: string): IJwtPayload | null {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'noion-development-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as IJwtPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Authorization Middleware Factory
 *
 * Creates middleware that checks if user has permission for resource+action
 *
 * @param resource - Resource being accessed (e.g., 'users:all', 'tasks:team')
 * @param action - Action being performed (e.g., 'read', 'create', 'update', 'delete')
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * // In API route
 * export async function GET(request: NextRequest) {
 *   const authCheck = await authorize('analytics:team', 'read')(request);
 *   if (authCheck instanceof NextResponse) return authCheck;
 *
 *   const { user } = authCheck;
 *   // ... proceed with authorized request
 * }
 * ```
 */
export function authorize(resource: string, action: string) {
  return async (request: NextRequest): Promise<{ user: IJwtPayload } | NextResponse> => {
    try {
      // Extract token
      const token = extractToken(request);
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'No authentication token provided' },
          { status: 401 }
        );
      }

      // Verify token
      const user = verifyToken(token);
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Check permission with Casbin
      const hasPermission = await casbinService.can(user.userId, user.role, resource, action);

      if (!hasPermission) {
        console.log(`🚫 Authorization failed: ${user.role} cannot ${action} on ${resource}`);
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: `You do not have permission to ${action} ${resource}`,
            details: {
              role: user.role,
              resource,
              action,
            },
          },
          { status: 403 }
        );
      }

      console.log(`✅ Authorization passed: ${user.role} can ${action} on ${resource}`);

      // Authorization passed, return user info
      return { user };
    } catch (error) {
      console.error('❌ Authorization middleware error:', error);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Authorization check failed' },
        { status: 500 }
      );
    }
  };
}

/**
 * Require ANY of multiple permissions (OR logic)
 */
export function authorizeAny(permissions: Array<{ resource: string; action: string }>) {
  return async (request: NextRequest): Promise<{ user: IJwtPayload } | NextResponse> => {
    try {
      const token = extractToken(request);
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'No authentication token provided' },
          { status: 401 }
        );
      }

      const user = verifyToken(token);
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Check if user has ANY of the permissions
      const hasPermission = await casbinService.canAny(user.userId, user.role, permissions);

      if (!hasPermission) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You do not have any of the required permissions',
          },
          { status: 403 }
        );
      }

      return { user };
    } catch (error) {
      console.error('❌ Authorization middleware error:', error);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Authorization check failed' },
        { status: 500 }
      );
    }
  };
}

/**
 * Require ALL of multiple permissions (AND logic)
 */
export function authorizeAll(permissions: Array<{ resource: string; action: string }>) {
  return async (request: NextRequest): Promise<{ user: IJwtPayload } | NextResponse> => {
    try {
      const token = extractToken(request);
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'No authentication token provided' },
          { status: 401 }
        );
      }

      const user = verifyToken(token);
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Check if user has ALL permissions
      const hasPermission = await casbinService.canAll(user.userId, user.role, permissions);

      if (!hasPermission) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You do not have all required permissions',
          },
          { status: 403 }
        );
      }

      return { user };
    } catch (error) {
      console.error('❌ Authorization middleware error:', error);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Authorization check failed' },
        { status: 500 }
      );
    }
  };
}

/**
 * Check if user has specific role (helper)
 */
export function requireRole(...roles: UserRole[]) {
  return async (request: NextRequest): Promise<{ user: IJwtPayload } | NextResponse> => {
    try {
      const token = extractToken(request);
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'No authentication token provided' },
          { status: 401 }
        );
      }

      const user = verifyToken(token);
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Check if user has one of the required roles
      if (!roles.includes(user.role as UserRole)) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: `This action requires one of these roles: ${roles.join(', ')}`,
          },
          { status: 403 }
        );
      }

      return { user };
    } catch (error) {
      console.error('❌ Role check error:', error);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Role check failed' },
        { status: 500 }
      );
    }
  };
}

/**
 * Extract user from request (no permission check, just authentication)
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ user: IJwtPayload } | NextResponse> {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No authentication token provided' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return { user };
  } catch (error) {
    console.error('❌ Get authenticated user error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Authentication failed' },
      { status: 500 }
    );
  }
}
