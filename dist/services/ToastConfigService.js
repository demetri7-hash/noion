"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToastConfigService = void 0;
const axios_1 = __importDefault(require("axios"));
const models_1 = require("../models");
const encryption_1 = require("../utils/encryption");
const TOAST_API_BASE_URL = process.env.TOAST_API_BASE_URL || 'https://ws-api.toasttab.com';
/**
 * Service for fetching Toast POS configuration data
 */
class ToastConfigService {
    constructor() {
        this.client = axios_1.default.create({
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
    async fetchRestaurantConfig(restaurantId) {
        try {
            console.log(`Fetching configuration for restaurant ${restaurantId}`);
            const restaurant = await models_1.Restaurant.findById(restaurantId);
            if (!restaurant || !restaurant.posConfig.isConnected) {
                throw new Error('Restaurant not connected to Toast');
            }
            // Decrypt access token
            const accessToken = encryption_1.EncryptionUtil.decrypt(restaurant.posConfig.encryptedAccessToken, this.encryptionKey);
            // Fetch restaurant configuration
            const response = await this.client.get(`/config/v2/restaurants/${restaurant.posConfig.locationId || restaurant.posConfig.managementGroupId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Toast-Restaurant-External-ID': restaurant.posConfig.locationId || restaurant.posConfig.managementGroupId
                }
            });
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
                    reportFrequency: 'weekly'
                };
            }
            else {
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
        }
        catch (error) {
            console.error('Failed to fetch restaurant config:', error.message);
            throw error;
        }
    }
    /**
     * Fetch service areas (dining room, patio, bar, etc.)
     * Returns mapping of GUID → name
     */
    async fetchServiceAreas(restaurantId) {
        try {
            console.log(`Fetching service areas for restaurant ${restaurantId}`);
            const restaurant = await models_1.Restaurant.findById(restaurantId);
            if (!restaurant || !restaurant.posConfig.isConnected) {
                throw new Error('Restaurant not connected to Toast');
            }
            const accessToken = encryption_1.EncryptionUtil.decrypt(restaurant.posConfig.encryptedAccessToken, this.encryptionKey);
            const response = await this.client.get(`/config/v2/serviceAreas`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Toast-Restaurant-External-ID': restaurant.posConfig.locationId || restaurant.posConfig.managementGroupId
                }
            });
            const serviceAreas = response.data;
            const mapping = new Map();
            serviceAreas.forEach(area => {
                if (area.active) {
                    mapping.set(area.guid, area.name);
                }
            });
            // Store mappings in database
            await models_1.ConfigMapping.bulkUpsertMappings(restaurantId, models_1.ConfigMappingType.SERVICE_AREA, mapping);
            console.log(`✅ Fetched ${mapping.size} service areas`);
            return mapping;
        }
        catch (error) {
            console.error('Failed to fetch service areas:', error.message);
            return new Map(); // Return empty map on error
        }
    }
    /**
     * Fetch revenue centers (restaurant, bar, catering, etc.)
     * Returns mapping of GUID → name
     */
    async fetchRevenueCenters(restaurantId) {
        try {
            console.log(`Fetching revenue centers for restaurant ${restaurantId}`);
            const restaurant = await models_1.Restaurant.findById(restaurantId);
            if (!restaurant || !restaurant.posConfig.isConnected) {
                throw new Error('Restaurant not connected to Toast');
            }
            const accessToken = encryption_1.EncryptionUtil.decrypt(restaurant.posConfig.encryptedAccessToken, this.encryptionKey);
            const response = await this.client.get(`/config/v2/revenueCenters`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Toast-Restaurant-External-ID': restaurant.posConfig.locationId || restaurant.posConfig.managementGroupId
                }
            });
            const revenueCenters = response.data;
            const mapping = new Map();
            revenueCenters.forEach(center => {
                mapping.set(center.guid, center.name);
            });
            // Store mappings in database
            await models_1.ConfigMapping.bulkUpsertMappings(restaurantId, models_1.ConfigMappingType.REVENUE_CENTER, mapping);
            console.log(`✅ Fetched ${mapping.size} revenue centers`);
            return mapping;
        }
        catch (error) {
            console.error('Failed to fetch revenue centers:', error.message);
            return new Map();
        }
    }
    /**
     * Fetch dining options (dine-in, takeout, delivery, etc.)
     * Returns mapping of GUID → name
     */
    async fetchDiningOptions(restaurantId) {
        try {
            console.log(`Fetching dining options for restaurant ${restaurantId}`);
            const restaurant = await models_1.Restaurant.findById(restaurantId);
            if (!restaurant || !restaurant.posConfig.isConnected) {
                throw new Error('Restaurant not connected to Toast');
            }
            const accessToken = encryption_1.EncryptionUtil.decrypt(restaurant.posConfig.encryptedAccessToken, this.encryptionKey);
            const response = await this.client.get(`/config/v2/diningOptions`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Toast-Restaurant-External-ID': restaurant.posConfig.locationId || restaurant.posConfig.managementGroupId
                }
            });
            const diningOptions = response.data;
            const mapping = new Map();
            diningOptions.forEach(option => {
                mapping.set(option.guid, option.name);
            });
            // Store mappings in database
            await models_1.ConfigMapping.bulkUpsertMappings(restaurantId, models_1.ConfigMappingType.DINING_OPTION, mapping);
            console.log(`✅ Fetched ${mapping.size} dining options`);
            return mapping;
        }
        catch (error) {
            console.error('Failed to fetch dining options:', error.message);
            return new Map();
        }
    }
    /**
     * Fetch all configuration data at once
     * Call this during initial restaurant setup
     */
    async fetchAllConfig(restaurantId) {
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
exports.ToastConfigService = ToastConfigService;
