import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Restaurant } from '../models';

// Authentication configuration
const AUTH_CONFIG = {
  jwtSecret: process.env.JWT_SECRET || 'noion-development-secret-key',
  jwtExpiresIn: '24h',
  refreshTokenExpiry: '7d',
  saltRounds: 12,
  passwordMinLength: 8,
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  passwordResetExpiry: 60 * 60 * 1000 // 1 hour
};

// User roles
export enum UserRole {
  RESTAURANT_OWNER = 'restaurant_owner',
  RESTAURANT_MANAGER = 'restaurant_manager',
  RESTAURANT_STAFF = 'restaurant_staff',
  ADMIN = 'admin'
}

// JWT payload interface
interface IJwtPayload {
  userId: string;
  restaurantId: string;
  role: UserRole;
  email: string;
  iat?: number;
  exp?: number;
}

// Authentication result interface
interface IAuthResult {
  success: boolean;
  message: string;
  user?: any;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Authentication Service
 * Handles user registration, login, JWT tokens, and security
 */
export class AuthService {

  /**
   * Register new restaurant owner
   */
  async registerRestaurantOwner(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    restaurantData: {
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      cuisine: string;
      timezone: string;
    };
  }): Promise<IAuthResult> {
    try {
      // Validate email format
      if (!this.isValidEmail(userData.email)) {
        return { success: false, message: 'Invalid email format' };
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(userData.password);
      if (!passwordValidation.valid) {
        return { success: false, message: passwordValidation.message };
      }

      // Check if user already exists
      const existingRestaurant = await Restaurant.findOne({
        'owner.email': userData.email.toLowerCase()
      });

      if (existingRestaurant) {
        return { success: false, message: 'Email already registered' };
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);

      // Create restaurant with owner
      const restaurant = new Restaurant({
        name: userData.restaurantData.name,
        location: {
          address: userData.restaurantData.address,
          city: userData.restaurantData.city,
          state: userData.restaurantData.state,
          zipCode: userData.restaurantData.zipCode,
          timezone: userData.restaurantData.timezone
        },
        cuisine: userData.restaurantData.cuisine,
        owner: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email.toLowerCase(),
          password: hashedPassword,
          phone: userData.phone,
          role: UserRole.RESTAURANT_OWNER
        },
        status: 'trial',
        subscription: {
          plan: 'trial',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
        },
        features: {
          posIntegration: true,
          aiInsights: true,
          customReports: false,
          multiLocation: false,
          advancedAnalytics: false,
          apiAccess: false,
          discoveryReportSent: false
        }
      });

      await restaurant.save();

      // Generate tokens
      const { token, refreshToken } = this.generateTokens({
        userId: restaurant.owner.email,
        restaurantId: String(restaurant._id),
        role: UserRole.RESTAURANT_OWNER,
        email: restaurant.owner.email
      });

      // Remove password from response
      const userResponse: any = restaurant.toObject();
      delete userResponse.owner.password;

      console.log(`✅ New restaurant owner registered: ${userData.email}`);

      return {
        success: true,
        message: 'Registration successful',
        user: userResponse,
        accessToken: token,
        refreshToken
      };

    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<IAuthResult> {
    try {
      // Find restaurant by owner email
      const restaurant = await Restaurant.findOne({
        'owner.email': email.toLowerCase()
      });

      if (!restaurant) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Check account lockout
      if (this.isAccountLocked(restaurant.owner)) {
        const lockoutTime = Math.ceil(
          (((restaurant as any).owner.lockoutUntil.getTime() - Date.now()) / 1000 / 60)
        );
        return { 
          success: false, 
          message: `Account locked. Try again in ${lockoutTime} minutes.` 
        };
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, (restaurant as any).owner.password);

      if (!isValidPassword) {
        // Increment failed attempts
        await this.handleFailedLogin(restaurant);
        return { success: false, message: 'Invalid credentials' };
      }

      // Reset failed attempts on successful login
      await this.handleSuccessfulLogin(restaurant);

      // Generate tokens
      const { token, refreshToken } = this.generateTokens({
        userId: restaurant.owner.email,
        restaurantId: String(restaurant._id),
        role: (restaurant as any).owner.role || UserRole.RESTAURANT_OWNER,
        email: restaurant.owner.email
      });

      // Remove password from response
      const userResponse: any = restaurant.toObject();
      delete userResponse.owner.password;

      console.log(`✅ User logged in: ${email}`);

      return {
        success: true,
        message: 'Login successful',
        user: userResponse,
        accessToken: token,
        refreshToken
      };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): IJwtPayload | null {
    try {
      return jwt.verify(token, AUTH_CONFIG.jwtSecret) as IJwtPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; message?: string }> {
    try {
      const decoded = this.verifyToken(refreshToken);

      if (!decoded) {
        throw new Error('Invalid or expired refresh token');
      }

      const restaurant = await Restaurant.findById(decoded.restaurantId);

      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const newPayload: IJwtPayload = {
        userId: decoded.userId,
        restaurantId: decoded.restaurantId,
        role: decoded.role,
        email: decoded.email
      };

      const tokens = this.generateTokens(newPayload);

      return {
        success: true,
        accessToken: tokens.token,
        refreshToken: tokens.refreshToken
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Generate JWT and refresh tokens
   */
  private generateTokens(payload: IJwtPayload): { token: string; refreshToken: string } {
    const token = jwt.sign(
      payload, 
      AUTH_CONFIG.jwtSecret
    );

    const refreshToken = jwt.sign(
      payload, 
      AUTH_CONFIG.jwtSecret
    );

    return { token, refreshToken };
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, AUTH_CONFIG.saltRounds);
  }

  /**
   * Verify password
   */
  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): { valid: boolean; message: string } {
    if (password.length < AUTH_CONFIG.passwordMinLength) {
      return {
        valid: false,
        message: `Password must be at least ${AUTH_CONFIG.passwordMinLength} characters long`
      };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one lowercase letter'
      };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one uppercase letter'
      };
    }

    if (!/(?=.*\d)/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one number'
      };
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return {
        valid: false,
        message: 'Password must contain at least one special character (@$!%*?&)'
      };
    }

    return { valid: true, message: 'Password is valid' };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if account is locked
   */
  private isAccountLocked(owner: any): boolean {
    return owner.lockoutUntil && owner.lockoutUntil > new Date();
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(restaurant: any): Promise<void> {
    restaurant.owner.failedLoginAttempts = (restaurant.owner.failedLoginAttempts || 0) + 1;

    if (restaurant.owner.failedLoginAttempts >= AUTH_CONFIG.maxLoginAttempts) {
      restaurant.owner.lockoutUntil = new Date(Date.now() + AUTH_CONFIG.lockoutDuration);
    }

    await restaurant.save();
  }

  /**
   * Handle successful login
   */
  private async handleSuccessfulLogin(restaurant: any): Promise<void> {
    restaurant.owner.failedLoginAttempts = 0;
    restaurant.owner.lockoutUntil = undefined;
    restaurant.owner.lastLoginAt = new Date();
    await restaurant.save();
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      const restaurant = await Restaurant.findOne({
        'owner.email': userId
      }).select('-owner.password');

      return restaurant;
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();