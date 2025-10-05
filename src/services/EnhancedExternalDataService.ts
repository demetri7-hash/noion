/**
 * Enhanced External Data Service
 *
 * Integrates ALL free external data sources:
 * - Events: Ticketmaster, Eventbrite, SeatGeek, Meetup
 * - Weather: Open-Meteo (already in ExternalDataService), NOAA Alerts
 * - Traffic: HERE Maps, US DOT Data
 * - Holidays: US Federal Holidays
 */

import axios from 'axios';

// ============================================================================
// INTERFACES
// ============================================================================

export interface Alert {
  id: string;
  type: 'weather' | 'traffic' | 'emergency';
  severity: 'extreme' | 'severe' | 'moderate' | 'minor' | 'unknown';
  event: string;
  headline: string;
  description: string;
  instruction?: string;
  areaDesc: string;
  onset: Date;
  expires: Date;
  source: string;
}

export interface Event {
  id: string;
  source: 'ticketmaster' | 'eventbrite' | 'seatgeek' | 'meetup';
  name: string;
  type: string;
  category: string;
  startDate: Date;
  endDate?: Date;
  venue: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    lat?: number;
    lon?: number;
  };
  url?: string;
  expectedAttendance?: number;
  distance?: number; // Miles from restaurant
}

export interface TrafficIncident {
  id: string;
  type: 'accident' | 'construction' | 'closure' | 'congestion' | 'other';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location: {
    street?: string;
    city?: string;
    state?: string;
    lat?: number;
    lon?: number;
  };
  startTime: Date;
  endTime?: Date;
  delay?: number; // Minutes
  source: string;
}

export interface Holiday {
  date: Date;
  name: string;
  type: 'federal' | 'cultural' | 'religious';
}

// ============================================================================
// ENHANCED EXTERNAL DATA SERVICE
// ============================================================================

export class EnhancedExternalDataService {
  private ticketmasterApiKey: string;
  private eventbriteToken?: string;
  private hereApiKey?: string;
  private userAgent = 'NOION-Analytics/1.0 (contact@noion.ai)';

  constructor() {
    this.ticketmasterApiKey = process.env.TICKETMASTER_API_KEY || '';
    this.eventbriteToken = process.env.EVENTBRITE_TOKEN;
    this.hereApiKey = process.env.HERE_API_KEY;
  }

  // ==========================================================================
  // EVENTS AGGREGATION
  // ==========================================================================

  /**
   * Get all events from all sources (Ticketmaster, Eventbrite, SeatGeek, Meetup)
   */
  async getAllEvents(
    lat: number,
    lon: number,
    radiusMiles: number,
    startDate: Date,
    endDate: Date
  ): Promise<Event[]> {
    console.log(`🎫 Fetching events from all sources...`);

    const events: Event[] = [];

    // Fetch from all sources in parallel
    const results = await Promise.allSettled([
      this.getTicketmasterEvents(lat, lon, radiusMiles, startDate, endDate),
      this.getEventbriteEvents(lat, lon, radiusMiles, startDate, endDate),
      this.getSeatGeekEvents(lat, lon, radiusMiles, startDate, endDate),
      this.getMeetupEvents(lat, lon, radiusMiles, startDate, endDate)
    ]);

    results.forEach((result, idx) => {
      const sources = ['Ticketmaster', 'Eventbrite', 'SeatGeek', 'Meetup'];
      if (result.status === 'fulfilled') {
        events.push(...result.value);
        console.log(`  ✅ ${sources[idx]}: ${result.value.length} events`);
      } else {
        console.log(`  ⚠️  ${sources[idx]}: ${result.reason}`);
      }
    });

    console.log(`  📊 Total events: ${events.length}`);
    return events;
  }

  /**
   * Ticketmaster Discovery API (FREE: 5K/day)
   */
  private async getTicketmasterEvents(
    lat: number,
    lon: number,
    radius: number,
    startDate: Date,
    endDate: Date
  ): Promise<Event[]> {
    if (!this.ticketmasterApiKey) {
      throw new Error('Ticketmaster API key not configured');
    }

    try {
      const response = await axios.get('https://app.ticketmaster.com/discovery/v2/events', {
        params: {
          apikey: this.ticketmasterApiKey,
          latlong: `${lat},${lon}`,
          radius,
          unit: 'miles',
          size: 100,
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString(),
          sort: 'date,asc'
        },
        timeout: 10000
      });

      if (!response.data._embedded?.events) {
        return [];
      }

      return response.data._embedded.events.map((event: any) => {
        const venue = event._embedded?.venues?.[0];
        return {
          id: event.id,
          source: 'ticketmaster' as const,
          name: event.name,
          type: event.type,
          category: event.classifications?.[0]?.segment?.name || 'Other',
          startDate: new Date(event.dates.start.dateTime || event.dates.start.localDate),
          endDate: event.dates.end?.dateTime ? new Date(event.dates.end.dateTime) : undefined,
          venue: {
            name: venue?.name || 'Unknown',
            address: venue?.address?.line1,
            city: venue?.city?.name,
            state: venue?.state?.stateCode,
            lat: venue?.location?.latitude ? parseFloat(venue.location.latitude) : undefined,
            lon: venue?.location?.longitude ? parseFloat(venue.location.longitude) : undefined
          },
          url: event.url,
          expectedAttendance: this.estimateAttendance(event.classifications?.[0]?.segment?.name)
        };
      });
    } catch (error: any) {
      throw new Error(`Ticketmaster API error: ${error.message}`);
    }
  }

  /**
   * Eventbrite API (FREE: 1K calls/hour)
   */
  private async getEventbriteEvents(
    lat: number,
    lon: number,
    radius: number,
    startDate: Date,
    endDate: Date
  ): Promise<Event[]> {
    if (!this.eventbriteToken) {
      throw new Error('Eventbrite token not configured (optional)');
    }

    try {
      const response = await axios.get('https://www.eventbriteapi.com/v3/events/search/', {
        params: {
          'location.latitude': lat,
          'location.longitude': lon,
          'location.within': `${radius}mi`,
          'start_date.range_start': startDate.toISOString(),
          'start_date.range_end': endDate.toISOString(),
          expand: 'venue'
        },
        headers: {
          Authorization: `Bearer ${this.eventbriteToken}`
        },
        timeout: 10000
      });

      return (response.data.events || []).map((event: any) => ({
        id: event.id,
        source: 'eventbrite' as const,
        name: event.name.text,
        type: 'event',
        category: event.category?.name || 'Other',
        startDate: new Date(event.start.utc),
        endDate: new Date(event.end.utc),
        venue: {
          name: event.venue?.name || 'Online',
          address: event.venue?.address?.address_1,
          city: event.venue?.address?.city,
          state: event.venue?.address?.region,
          lat: event.venue?.latitude ? parseFloat(event.venue.latitude) : undefined,
          lon: event.venue?.longitude ? parseFloat(event.venue.longitude) : undefined
        },
        url: event.url,
        expectedAttendance: event.capacity || 100
      }));
    } catch (error: any) {
      throw new Error(`Eventbrite API error: ${error.message}`);
    }
  }

  /**
   * SeatGeek API (FREE: Unlimited)
   */
  private async getSeatGeekEvents(
    lat: number,
    lon: number,
    radius: number,
    startDate: Date,
    endDate: Date
  ): Promise<Event[]> {
    try {
      const response = await axios.get('https://api.seatgeek.com/2/events', {
        params: {
          lat,
          lon,
          range: `${radius}mi`,
          'datetime_utc.gte': startDate.toISOString(),
          'datetime_utc.lte': endDate.toISOString(),
          per_page: 100
        },
        timeout: 10000
      });

      return (response.data.events || []).map((event: any) => ({
        id: event.id.toString(),
        source: 'seatgeek' as const,
        name: event.title,
        type: event.type,
        category: event.taxonomies?.[0]?.name || 'Other',
        startDate: new Date(event.datetime_utc),
        venue: {
          name: event.venue?.name || 'Unknown',
          address: event.venue?.address,
          city: event.venue?.city,
          state: event.venue?.state,
          lat: event.venue?.location?.lat,
          lon: event.venue?.location?.lon
        },
        url: event.url,
        expectedAttendance: event.venue?.capacity || event.stats?.average_price ? 1000 : 100
      }));
    } catch (error: any) {
      throw new Error(`SeatGeek API error: ${error.message}`);
    }
  }

  /**
   * Meetup API (FREE: Unlimited)
   */
  private async getMeetupEvents(
    lat: number,
    lon: number,
    radius: number,
    startDate: Date,
    endDate: Date
  ): Promise<Event[]> {
    try {
      // Meetup's GraphQL API endpoint
      const response = await axios.post(
        'https://www.meetup.com/gql',
        {
          query: `
            query($lat: Float!, $lon: Float!, $radius: Int!, $startDate: String!, $endDate: String!) {
              rankedEvents(filter: {
                lat: $lat
                lon: $lon
                radius: $radius
                startDateRange: $startDate
                endDateRange: $endDate
              }) {
                edges {
                  node {
                    id
                    title
                    eventType
                    dateTime
                    endTime
                    venue {
                      name
                      address
                      city
                      state
                      lat
                      lng
                    }
                    going
                    maxTickets
                  }
                }
              }
            }
          `,
          variables: {
            lat,
            lon,
            radius: Math.round(radius),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        },
        { timeout: 10000 }
      );

      const events = response.data?.data?.rankedEvents?.edges || [];

      return events.map((edge: any) => {
        const event = edge.node;
        return {
          id: event.id,
          source: 'meetup' as const,
          name: event.title,
          type: 'meetup',
          category: event.eventType || 'Community',
          startDate: new Date(event.dateTime),
          endDate: event.endTime ? new Date(event.endTime) : undefined,
          venue: {
            name: event.venue?.name || 'TBD',
            address: event.venue?.address,
            city: event.venue?.city,
            state: event.venue?.state,
            lat: event.venue?.lat,
            lon: event.venue?.lng
          },
          expectedAttendance: event.going || event.maxTickets || 30
        };
      });
    } catch (error: any) {
      throw new Error(`Meetup API error: ${error.message}`);
    }
  }

  // ==========================================================================
  // WEATHER ALERTS
  // ==========================================================================

  /**
   * NOAA Weather.gov Alerts API (FREE: Unlimited)
   */
  async getWeatherAlerts(state: string): Promise<Alert[]> {
    try {
      console.log(`🌪️  Fetching NOAA alerts for ${state}...`);

      const response = await axios.get(`https://api.weather.gov/alerts/active`, {
        params: { area: state },
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000
      });

      const features = response.data.features || [];
      console.log(`  ✅ Found ${features.length} active alerts`);

      return features.map((feature: any) => {
        const props = feature.properties;
        return {
          id: props.id,
          type: 'weather' as const,
          severity: this.mapNOAASeverity(props.severity),
          event: props.event,
          headline: props.headline,
          description: props.description,
          instruction: props.instruction,
          areaDesc: props.areaDesc,
          onset: new Date(props.onset),
          expires: new Date(props.expires),
          source: 'NOAA'
        };
      });
    } catch (error: any) {
      console.error(`NOAA API error: ${error.message}`);
      return [];
    }
  }

  private mapNOAASeverity(severity: string): Alert['severity'] {
    const map: Record<string, Alert['severity']> = {
      'Extreme': 'extreme',
      'Severe': 'severe',
      'Moderate': 'moderate',
      'Minor': 'minor'
    };
    return map[severity] || 'unknown';
  }

  // ==========================================================================
  // TRAFFIC DATA
  // ==========================================================================

  /**
   * HERE Maps Traffic API (FREE: 5K/month)
   */
  async getTrafficIncidents(lat: number, lon: number, radiusMiles: number): Promise<TrafficIncident[]> {
    if (!this.hereApiKey) {
      console.log('⚠️  HERE API key not configured (optional)');
      return [];
    }

    try {
      console.log(`🚗 Fetching HERE Maps traffic incidents...`);

      // Convert miles to meters for HERE API
      const radiusMeters = radiusMiles * 1609.34;

      const response = await axios.get('https://data.traffic.hereapi.com/v7/incidents', {
        params: {
          apiKey: this.hereApiKey,
          in: `circle:${lat},${lon};r=${radiusMeters}`,
          lang: 'en-US'
        },
        timeout: 10000
      });

      const incidents = response.data.results || [];
      console.log(`  ✅ Found ${incidents.length} traffic incidents`);

      return incidents.map((incident: any) => ({
        id: incident.incidentDetails.id,
        type: this.mapHEREIncidentType(incident.incidentDetails.type),
        severity: this.mapHERESeverity(incident.incidentDetails.criticality),
        description: incident.incidentDetails.description?.value || 'Traffic incident',
        location: {
          street: incident.location?.street1,
          city: incident.location?.city,
          state: incident.location?.state,
          lat: incident.location?.shape?.links?.[0]?.points?.[0]?.lat,
          lon: incident.location?.shape?.links?.[0]?.points?.[0]?.lng
        },
        startTime: new Date(incident.incidentDetails.startTime),
        endTime: incident.incidentDetails.endTime ? new Date(incident.incidentDetails.endTime) : undefined,
        delay: incident.incidentDetails.estimatedDuration,
        source: 'HERE Maps'
      }));
    } catch (error: any) {
      console.error(`HERE API error: ${error.message}`);
      return [];
    }
  }

  private mapHEREIncidentType(type: number): TrafficIncident['type'] {
    // HERE incident type codes
    const map: Record<number, TrafficIncident['type']> = {
      1: 'accident',
      2: 'congestion',
      3: 'construction',
      4: 'closure',
      8: 'other'
    };
    return map[type] || 'other';
  }

  private mapHERESeverity(criticality: number): TrafficIncident['severity'] {
    if (criticality >= 3) return 'high';
    if (criticality >= 2) return 'medium';
    return 'low';
  }

  /**
   * US DOT Traffic Data (FREE: Unlimited government data)
   */
  async getUSDOTTrafficData(state: string): Promise<TrafficIncident[]> {
    try {
      console.log(`🚦 Fetching US DOT traffic data for ${state}...`);

      // US DOT 511 data (varies by state)
      // Example: California 511 API
      // Note: Each state has different endpoints
      // This is a placeholder - would need state-specific implementations

      console.log('  ℹ️  US DOT integration requires state-specific endpoints');
      return [];
    } catch (error: any) {
      console.error(`US DOT API error: ${error.message}`);
      return [];
    }
  }

  // ==========================================================================
  // HOLIDAYS
  // ==========================================================================

  /**
   * US Federal Holidays (Hardcoded - FREE)
   */
  getUSHolidays(year: number): Holiday[] {
    const holidays: Holiday[] = [];

    // Fixed date holidays
    const fixed = [
      { month: 0, day: 1, name: "New Year's Day" },
      { month: 6, day: 4, name: 'Independence Day' },
      { month: 10, day: 11, name: 'Veterans Day' },
      { month: 11, day: 25, name: 'Christmas Day' }
    ];

    fixed.forEach(h => {
      holidays.push({
        date: new Date(year, h.month, h.day),
        name: h.name,
        type: 'federal'
      });
    });

    // Floating holidays (simplified - would need proper calculation)
    // MLK Day: 3rd Monday in January
    holidays.push({
      date: this.getNthWeekdayOfMonth(year, 0, 1, 3),
      name: 'Martin Luther King Jr. Day',
      type: 'federal'
    });

    // Presidents Day: 3rd Monday in February
    holidays.push({
      date: this.getNthWeekdayOfMonth(year, 1, 1, 3),
      name: "Presidents' Day",
      type: 'federal'
    });

    // Memorial Day: Last Monday in May
    holidays.push({
      date: this.getLastWeekdayOfMonth(year, 4, 1),
      name: 'Memorial Day',
      type: 'federal'
    });

    // Labor Day: 1st Monday in September
    holidays.push({
      date: this.getNthWeekdayOfMonth(year, 8, 1, 1),
      name: 'Labor Day',
      type: 'federal'
    });

    // Thanksgiving: 4th Thursday in November
    holidays.push({
      date: this.getNthWeekdayOfMonth(year, 10, 4, 4),
      name: 'Thanksgiving',
      type: 'federal'
    });

    return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const offset = (weekday - firstWeekday + 7) % 7;
    const day = 1 + offset + (n - 1) * 7;
    return new Date(year, month, day);
  }

  private getLastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
    const lastDay = new Date(year, month + 1, 0);
    const lastWeekday = lastDay.getDay();
    const offset = (lastWeekday - weekday + 7) % 7;
    return new Date(year, month, lastDay.getDate() - offset);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private estimateAttendance(category?: string): number {
    const estimates: Record<string, number> = {
      'Sports': 5000,
      'Music': 2000,
      'Arts & Theatre': 500,
      'Family': 1000,
      'Other': 200
    };
    return estimates[category || 'Other'] || 200;
  }

  /**
   * Calculate distance between two lat/lon points (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const enhancedExternalDataService = new EnhancedExternalDataService();
