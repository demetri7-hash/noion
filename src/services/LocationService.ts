import axios from 'axios';
import Restaurant from '../models/Restaurant';

/**
 * Location Service
 * Gets restaurant location from Toast API or geocodes address
 * Provides lat/long coordinates for weather and event services
 */

export interface RestaurantLocation {
  restaurantId: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  source: 'toast' | 'database' | 'geocoded';
}

export class LocationService {
  private geocodingApiKey: string;
  private toastBaseUrl = 'https://ws-api.toasttab.com';

  constructor() {
    this.geocodingApiKey = process.env.GOOGLE_GEOCODING_API_KEY || '';
  }

  /**
   * Get restaurant location with coordinates
   * Priority: Toast API > Database > Geocoding
   */
  async getRestaurantLocation(restaurantId: string): Promise<RestaurantLocation | null> {
    try {
      // 1. Try Toast API first
      const toastLocation = await this.getLocationFromToast(restaurantId);
      if (toastLocation) {
        return toastLocation;
      }

      // 2. Try database
      const dbLocation = await this.getLocationFromDatabase(restaurantId);
      if (dbLocation) {
        // If we have address but no coordinates, geocode it
        if (!dbLocation.latitude || !dbLocation.longitude) {
          const geocoded = await this.geocodeAddress(
            dbLocation.address,
            dbLocation.city,
            dbLocation.state,
            dbLocation.zipCode
          );

          if (geocoded) {
            // Update database with coordinates
            await this.updateRestaurantCoordinates(
              restaurantId,
              geocoded.latitude,
              geocoded.longitude
            );

            return {
              ...dbLocation,
              latitude: geocoded.latitude,
              longitude: geocoded.longitude,
              source: 'geocoded'
            };
          }
        }

        return dbLocation;
      }

      return null;
    } catch (error) {
      console.error('Error getting restaurant location:', error);
      return null;
    }
  }

  /**
   * Get location from Toast API
   */
  private async getLocationFromToast(restaurantId: string): Promise<RestaurantLocation | null> {
    try {
      // Get restaurant info from database
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant || !restaurant.posConfig?.isConnected) {
        return null;
      }

      // Get access token
      const encryptedToken = restaurant.posConfig.encryptedAccessToken;
      if (!encryptedToken) {
        return null;
      }
      const accessToken = this.decryptToastToken(encryptedToken);

      // Fetch restaurant info from Toast
      const response = await axios.get(`${this.toastBaseUrl}/restaurants/v1/restaurants`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Toast-Restaurant-External-ID': restaurant.posConfig.locationId || ''
        }
      });

      const toastData = response.data;
      if (!toastData || !toastData.length) {
        return null;
      }

      const restaurantInfo = toastData[0];
      const address = restaurantInfo.address || {};

      // Extract location data
      const locationData: RestaurantLocation = {
        restaurantId,
        latitude: address.latitude || 0,
        longitude: address.longitude || 0,
        address: `${address.address1 || ''} ${address.address2 || ''}`.trim(),
        city: address.city || '',
        state: address.state || '',
        zipCode: address.zipCode || '',
        source: 'toast'
      };

      // If Toast doesn't provide coordinates, geocode the address
      if (!locationData.latitude || !locationData.longitude) {
        const geocoded = await this.geocodeAddress(
          locationData.address,
          locationData.city,
          locationData.state,
          locationData.zipCode
        );

        if (geocoded) {
          locationData.latitude = geocoded.latitude;
          locationData.longitude = geocoded.longitude;
        }
      }

      // Cache in database
      if (locationData.latitude && locationData.longitude) {
        await this.updateRestaurantCoordinates(
          restaurantId,
          locationData.latitude,
          locationData.longitude
        );

        // Also update address if we have better data
        if (locationData.zipCode && locationData.zipCode !== restaurant.location?.zipCode) {
          await Restaurant.findByIdAndUpdate(restaurantId, {
            $set: {
              'location.address': locationData.address,
              'location.city': locationData.city,
              'location.state': locationData.state,
              'location.zipCode': locationData.zipCode,
              'location.country': 'US'
            }
          });
        }
      }

      return locationData;
    } catch (error) {
      console.error('Error fetching from Toast API:', error);
      return null;
    }
  }

  /**
   * Get location from database
   */
  private async getLocationFromDatabase(restaurantId: string): Promise<RestaurantLocation | null> {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.location) {
      return null;
    }

    const location = restaurant.location;

    return {
      restaurantId,
      latitude: location.latitude || 0,
      longitude: location.longitude || 0,
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      zipCode: location.zipCode || '',
      source: 'database'
    };
  }

  /**
   * Geocode an address to get lat/long
   */
  private async geocodeAddress(
    address: string,
    city: string,
    state: string,
    zipCode: string
  ): Promise<{ latitude: number; longitude: number } | null> {
    try {
      // Build full address string
      const fullAddress = [address, city, state, zipCode]
        .filter(Boolean)
        .join(', ');

      if (!fullAddress || fullAddress.length < 5) {
        return null;
      }

      // Try Google Geocoding API first
      if (this.geocodingApiKey) {
        const googleResult = await this.geocodeWithGoogle(fullAddress);
        if (googleResult) {
          return googleResult;
        }
      }

      // Fallback to free Nominatim (OpenStreetMap)
      return await this.geocodeWithNominatim(fullAddress);
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Geocode using Google Maps API
   */
  private async geocodeWithGoogle(
    address: string
  ): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address,
          key: this.geocodingApiKey
        }
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng
        };
      }

      return null;
    } catch (error) {
      console.error('Google geocoding error:', error);
      return null;
    }
  }

  /**
   * Geocode using Nominatim (OpenStreetMap) - Free alternative
   */
  private async geocodeWithNominatim(
    address: string
  ): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          limit: 1,
          countrycodes: 'us'
        },
        headers: {
          'User-Agent': 'NOION-Analytics/1.0' // Required by Nominatim
        }
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon)
        };
      }

      return null;
    } catch (error) {
      console.error('Nominatim geocoding error:', error);
      return null;
    }
  }

  /**
   * Update restaurant coordinates in database
   */
  private async updateRestaurantCoordinates(
    restaurantId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    await Restaurant.findByIdAndUpdate(restaurantId, {
      $set: {
        'location.latitude': latitude,
        'location.longitude': longitude
      }
    });
  }

  /**
   * Decrypt Toast access token
   */
  private decryptToastToken(encryptedToken: string): string {
    // In production, implement proper decryption
    // For now, return as-is (assumes it's already decrypted for testing)
    return encryptedToken;
  }

  /**
   * Get location for multiple restaurants (batch processing)
   */
  async getLocationsForRestaurants(
    restaurantIds: string[]
  ): Promise<Map<string, RestaurantLocation>> {
    const locations = new Map<string, RestaurantLocation>();

    await Promise.all(
      restaurantIds.map(async (id) => {
        const location = await this.getRestaurantLocation(id);
        if (location) {
          locations.set(id, location);
        }
      })
    );

    return locations;
  }

  /**
   * Calculate distance between two coordinates (in miles)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get region based on state
   */
  getRegion(state: string): string {
    const regions: { [key: string]: string } = {
      // Northeast
      'CT': 'northeast', 'ME': 'northeast', 'MA': 'northeast', 'NH': 'northeast',
      'RI': 'northeast', 'VT': 'northeast', 'NJ': 'northeast', 'NY': 'northeast',
      'PA': 'northeast',

      // Southeast
      'DE': 'southeast', 'FL': 'southeast', 'GA': 'southeast', 'MD': 'southeast',
      'NC': 'southeast', 'SC': 'southeast', 'VA': 'southeast', 'WV': 'southeast',
      'AL': 'southeast', 'KY': 'southeast', 'MS': 'southeast', 'TN': 'southeast',

      // Midwest
      'IL': 'midwest', 'IN': 'midwest', 'MI': 'midwest', 'OH': 'midwest',
      'WI': 'midwest', 'IA': 'midwest', 'KS': 'midwest', 'MN': 'midwest',
      'MO': 'midwest', 'NE': 'midwest', 'ND': 'midwest', 'SD': 'midwest',

      // Southwest
      'AZ': 'southwest', 'NM': 'southwest', 'OK': 'southwest', 'TX': 'southwest',

      // West
      'CO': 'west', 'ID': 'west', 'MT': 'west', 'NV': 'west',
      'UT': 'west', 'WY': 'west',

      // Pacific
      'AK': 'pacific', 'CA': 'pacific', 'HI': 'pacific', 'OR': 'pacific', 'WA': 'pacific'
    };

    return regions[state.toUpperCase()] || 'unknown';
  }
}

// Export singleton
export const locationService = new LocationService();
