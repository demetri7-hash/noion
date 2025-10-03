/**
 * Toast Configuration Service
 *
 * Handles fetching and caching Toast configuration data:
 * - Restaurant settings (timezone, business hours)
 * - Service areas (patio, dining room, bar)
 * - Revenue centers (restaurant, bar, catering)
 * - Dining options (dine-in, takeout, delivery)
 *
 * This data is fetched once and cached to provide human-readable
 * names for GUIDs and enable timezone-aware displays.
 */

import axios, { AxiosInstance } from 'axios';
import { Restaurant, ConfigMapping, ConfigMappingType } from '../models';
import { EncryptionUtil } from '../utils/encryption';

const TOAST_API_BASE_URL = process.env.TOAST_API_BASE_URL || 'https://ws-api.toasttab.com';

// Toast configuration interfaces
interface IToastRestaurantConfig {
  guid: string;
  name: string;
  locationName?: string;
  timeZone?: string;
  currency?: string;
  locale?: string;
  closeoutHour?: number;
  managementGroupGuid?: string;
  prepTimes?: {
    [key: string]: {
      orderReadyEstimate: number;
    };
  };
}

interface IToastServiceArea {
  guid: string;
  name: string;
  active: boolean;
}

interface IToastRevenueCenter {
  guid: string;
  name: string;
}

interface IToastDiningOption {
  guid: string;
  name: string;
  behavior: 'DINE_IN' | 'TAKE_OUT' | 'DELIVERY' | 'BAR' | 'CATERING';
  curbside?: boolean;
}

/**
 * Service for fetching Toast POS configuration data
 */
export class ToastConfigService {
  private client: AxiosInstance;
  private encryptionKey: string;

  constructor() {
    this.client = axios.create({
      baseURL: TOAST_API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    this.encryptionKey = process.env.ENCRYPTION_KEY || '';
    if (!this.encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
  }

  /**
   * Fetch and store restaurant configuration including timezone
   */
  async fetchRestaurantConfig(restaurantId: string): Promise<{
    timezone: string;
    name: string;
    closeoutHour: number;
  }> {
    try {
      console.log(`Fetching configuration for restaurant ${restaurantId}`);

      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant || !restaurant.posConfig.isConnected) {
        throw new Error('Restaurant not connected to Toast');
      }

      // Decrypt access token
      const accessToken = EncryptionUtil.decrypt(
        restaurant.posConfig.encryptedAccessToken!,
        this.encryptionKey
      );

      // Fetch restaurant configuration
      const response = await this.client.get<IToastRestaurantConfig>(
        `/config/v2/restaurants/${restaurant.posConfig.locationId || restaurant.posConfig.managementGroupId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Toast-Restaurant-External-ID': restaurant.posConfig.locationId || restaurant.posConfig.managementGroupId
          }
        }
      );

      const config = response.data;

      // Update restaurant with timezone
      if (!restaurant.analyticsSettings) {
        restaurant.analyticsSettings = {
          timezone: config.timeZone || 'America/Los_Angeles',
          businessHours: {
            monday: { open: '09:00', close: '21:00' },
            tuesday: { open: '09:00', close: '21:00' },
            wednesday: { open: '09:00', close: '21:00' },
            thursday: { open: '09:00', close: '21:00' },
            friday: { open: '09:00', close: '21:00' },
            saturday: { open: '09:00', close: '21:00' },
            sunday: { open: '09:00', close: '21:00' }
          },
          revenueGoal: 0,
          laborCostPercentageGoal: 30,
          enableEmailReports: true,
          reportFrequency: 'weekly' as const
        };
      } else {
        restaurant.analyticsSettings.timezone = config.timeZone || 'America/Los_Angeles';
      }

      // Update restaurant name if it changed
      if (config.name && config.name !== restaurant.name) {
        restaurant.name = config.name;
      }

      await restaurant.save();

      console.log(`✅ Restaurant config fetched: ${config.name}, timezone: ${config.timeZone}`);

      return {
        timezone: config.timeZone || 'America/Los_Angeles',
        name: config.name,
        closeoutHour: config.closeoutHour || 4
      };

    } catch (error: any) {
      console.error('Failed to fetch restaurant config:', error.message);
      throw error;
    }
  }

  /**
   * Fetch service areas (dining room, patio, bar, etc.)
   * Returns mapping of GUID → name
   */
  async fetchServiceAreas(restaurantId: string): Promise<Map<string, string>> {
    try {
      console.log(`Fetching service areas for restaurant ${restaurantId}`);

      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant || !restaurant.posConfig.isConnected) {
        throw new Error('Restaurant not connected to Toast');
      }

      const accessToken = EncryptionUtil.decrypt(
        restaurant.posConfig.encryptedAccessToken!,
        this.encryptionKey
      );

      const response = await this.client.get<IToastServiceArea[]>(
        `/config/v2/serviceAreas`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Toast-Restaurant-External-ID': restaurant.posConfig.locationId || restaurant.posConfig.managementGroupId
          }
        }
      );

      const serviceAreas = response.data;
      const mapping = new Map<string, string>();

      serviceAreas.forEach(area => {
        if (area.active) {
          mapping.set(area.guid, area.name);
        }
      });

      // Store mappings in database
      await (ConfigMapping as any).bulkUpsertMappings(
        restaurantId,
        ConfigMappingType.SERVICE_AREA,
        mapping
      );

      console.log(`✅ Fetched ${mapping.size} service areas`);
      return mapping;

    } catch (error: any) {
      console.error('Failed to fetch service areas:', error.message);
      return new Map(); // Return empty map on error
    }
  }

  /**
   * Fetch revenue centers (restaurant, bar, catering, etc.)
   * Returns mapping of GUID → name
   */
  async fetchRevenueCenters(restaurantId: string): Promise<Map<string, string>> {
    try {
      console.log(`Fetching revenue centers for restaurant ${restaurantId}`);

      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant || !restaurant.posConfig.isConnected) {
        throw new Error('Restaurant not connected to Toast');
      }

      const accessToken = EncryptionUtil.decrypt(
        restaurant.posConfig.encryptedAccessToken!,
        this.encryptionKey
      );

      const response = await this.client.get<IToastRevenueCenter[]>(
        `/config/v2/revenueCenters`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Toast-Restaurant-External-ID': restaurant.posConfig.locationId || restaurant.posConfig.managementGroupId
          }
        }
      );

      const revenueCenters = response.data;
      const mapping = new Map<string, string>();

      revenueCenters.forEach(center => {
        mapping.set(center.guid, center.name);
      });

      // Store mappings in database
      await (ConfigMapping as any).bulkUpsertMappings(
        restaurantId,
        ConfigMappingType.REVENUE_CENTER,
        mapping
      );

      console.log(`✅ Fetched ${mapping.size} revenue centers`);
      return mapping;

    } catch (error: any) {
      console.error('Failed to fetch revenue centers:', error.message);
      return new Map();
    }
  }

  /**
   * Fetch dining options (dine-in, takeout, delivery, etc.)
   * Returns mapping of GUID → name
   */
  async fetchDiningOptions(restaurantId: string): Promise<Map<string, string>> {
    try {
      console.log(`Fetching dining options for restaurant ${restaurantId}`);

      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant || !restaurant.posConfig.isConnected) {
        throw new Error('Restaurant not connected to Toast');
      }

      const accessToken = EncryptionUtil.decrypt(
        restaurant.posConfig.encryptedAccessToken!,
        this.encryptionKey
      );

      const response = await this.client.get<IToastDiningOption[]>(
        `/config/v2/diningOptions`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Toast-Restaurant-External-ID': restaurant.posConfig.locationId || restaurant.posConfig.managementGroupId
          }
        }
      );

      const diningOptions = response.data;
      const mapping = new Map<string, string>();

      diningOptions.forEach(option => {
        mapping.set(option.guid, option.name);
      });

      // Store mappings in database
      await (ConfigMapping as any).bulkUpsertMappings(
        restaurantId,
        ConfigMappingType.DINING_OPTION,
        mapping
      );

      console.log(`✅ Fetched ${mapping.size} dining options`);
      return mapping;

    } catch (error: any) {
      console.error('Failed to fetch dining options:', error.message);
      return new Map();
    }
  }

  /**
   * Fetch all configuration data at once
   * Call this during initial restaurant setup
   */
  async fetchAllConfig(restaurantId: string): Promise<{
    timezone: string;
    restaurantName: string;
    serviceAreas: Map<string, string>;
    revenueCenters: Map<string, string>;
    diningOptions: Map<string, string>;
  }> {
    console.log(`🔧 Fetching all configuration for restaurant ${restaurantId}`);

    // Fetch restaurant config first (includes timezone)
    const restaurantConfig = await this.fetchRestaurantConfig(restaurantId);

    // Fetch mappings in parallel
    const [serviceAreas, revenueCenters, diningOptions] = await Promise.all([
      this.fetchServiceAreas(restaurantId),
      this.fetchRevenueCenters(restaurantId),
      this.fetchDiningOptions(restaurantId)
    ]);

    console.log(`✅ All configuration fetched successfully`);

    return {
      timezone: restaurantConfig.timezone,
      restaurantName: restaurantConfig.name,
      serviceAreas,
      revenueCenters,
      diningOptions
    };
  }
}
