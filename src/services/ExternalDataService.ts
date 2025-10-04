import axios from 'axios';

/**
 * External Data Service
 * Integrates weather, events, and contextual data for enhanced analytics
 */

// ============================================================================
// WEATHER DATA
// ============================================================================

export interface WeatherData {
  timestamp: Date;
  temperature: number;
  feelsLike: number;
  condition: string;
  description: string;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  visibility: number;
  uvIndex: number;

  // Derived fields
  isRaining: boolean;
  isSnowing: boolean;
  isClear: boolean;
  isExtreme: boolean; // Too hot, too cold, severe weather
  weatherCategory: 'excellent' | 'good' | 'fair' | 'poor' | 'severe';
}

export class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
  }

  /**
   * Get current weather for location
   */
  async getCurrentWeather(lat: number, lon: number): Promise<WeatherData | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'imperial' // Fahrenheit
        }
      });

      return this.parseWeatherResponse(response.data);
    } catch (error) {
      console.error('Weather API error:', error);
      return null;
    }
  }

  /**
   * Get historical weather data
   */
  async getHistoricalWeather(
    lat: number,
    lon: number,
    timestamp: number
  ): Promise<WeatherData | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/onecall/timemachine`, {
        params: {
          lat,
          lon,
          dt: Math.floor(timestamp / 1000),
          appid: this.apiKey,
          units: 'imperial'
        }
      });

      if (response.data?.current) {
        return this.parseWeatherResponse(response.data.current);
      }
      return null;
    } catch (error) {
      console.error('Historical weather error:', error);
      return null;
    }
  }

  /**
   * Get weather forecast
   */
  async getWeatherForecast(lat: number, lon: number, days: number = 7): Promise<WeatherData[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'imperial',
          cnt: days * 8 // 3-hour intervals
        }
      });

      return response.data.list.map((item: any) =>
        this.parseWeatherResponse(item)
      );
    } catch (error) {
      console.error('Weather forecast error:', error);
      return [];
    }
  }

  private parseWeatherResponse(data: any): WeatherData {
    const temp = data.main.temp;
    const condition = data.weather[0].main.toLowerCase();
    const description = data.weather[0].description;

    const isRaining = condition.includes('rain') || condition.includes('drizzle');
    const isSnowing = condition.includes('snow');
    const isClear = condition === 'clear';
    const isExtreme = temp < 32 || temp > 95 || condition.includes('thunderstorm');

    let weatherCategory: 'excellent' | 'good' | 'fair' | 'poor' | 'severe';
    if (isExtreme) {
      weatherCategory = 'severe';
    } else if (isRaining || isSnowing) {
      weatherCategory = 'poor';
    } else if (condition === 'clouds') {
      weatherCategory = 'fair';
    } else if (isClear && temp >= 65 && temp <= 85) {
      weatherCategory = 'excellent';
    } else {
      weatherCategory = 'good';
    }

    return {
      timestamp: new Date(data.dt * 1000),
      temperature: temp,
      feelsLike: data.main.feels_like,
      condition,
      description,
      humidity: data.main.humidity,
      precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
      windSpeed: data.wind.speed,
      visibility: data.visibility,
      uvIndex: data.uvi || 0,
      isRaining,
      isSnowing,
      isClear,
      isExtreme,
      weatherCategory
    };
  }
}

// ============================================================================
// LOCAL EVENTS DATA
// ============================================================================

export interface LocalEvent {
  id: string;
  name: string;
  type: string;
  category: 'sports' | 'concert' | 'festival' | 'conference' | 'other';
  startDate: Date;
  endDate: Date;
  venue: string;
  expectedAttendance: number;
  distance: number; // Miles from restaurant
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class EventsService {
  private apiKey: string;
  private ticketmasterBaseUrl = 'https://app.ticketmaster.com/discovery/v2';

  constructor() {
    this.apiKey = process.env.TICKETMASTER_API_KEY || '';
  }

  /**
   * Get local events near a location
   */
  async getLocalEvents(
    lat: number,
    lon: number,
    radiusMiles: number = 5,
    startDate?: Date,
    endDate?: Date
  ): Promise<LocalEvent[]> {
    try {
      const params: any = {
        apikey: this.apiKey,
        latlong: `${lat},${lon}`,
        radius: radiusMiles,
        unit: 'miles',
        size: 50
      };

      if (startDate) {
        params.startDateTime = startDate.toISOString();
      }
      if (endDate) {
        params.endDateTime = endDate.toISOString();
      }

      const response = await axios.get(`${this.ticketmasterBaseUrl}/events`, {
        params
      });

      return this.parseEventsResponse(response.data, lat, lon);
    } catch (error) {
      console.error('Events API error:', error);
      return [];
    }
  }

  /**
   * Get major events that could impact traffic
   */
  async getMajorEvents(
    lat: number,
    lon: number,
    date: Date
  ): Promise<LocalEvent[]> {
    const events = await this.getLocalEvents(
      lat,
      lon,
      10, // 10 mile radius for major events
      date,
      new Date(date.getTime() + 24 * 60 * 60 * 1000)
    );

    // Filter for major events only
    return events.filter(event =>
      event.expectedAttendance > 1000 ||
      event.category === 'sports' ||
      event.category === 'festival'
    );
  }

  private parseEventsResponse(data: any, restaurantLat: number, restaurantLon: number): LocalEvent[] {
    if (!data._embedded?.events) return [];

    return data._embedded.events.map((event: any) => {
      const venue = event._embedded?.venues?.[0];
      const venueLat = parseFloat(venue?.location?.latitude || 0);
      const venueLon = parseFloat(venue?.location?.longitude || 0);

      const distance = this.calculateDistance(
        restaurantLat,
        restaurantLon,
        venueLat,
        venueLon
      );

      const category = this.categorizeEvent(event.classifications?.[0]);
      const expectedAttendance = this.estimateAttendance(event, venue);
      const impactLevel = this.calculateImpactLevel(distance, expectedAttendance, category);

      return {
        id: event.id,
        name: event.name,
        type: event.type,
        category,
        startDate: new Date(event.dates.start.dateTime),
        endDate: new Date(event.dates.end?.dateTime || event.dates.start.dateTime),
        venue: venue?.name || 'Unknown',
        expectedAttendance,
        distance,
        impactLevel
      };
    });
  }

  private categorizeEvent(classification: any): LocalEvent['category'] {
    const segment = classification?.segment?.name?.toLowerCase() || '';
    const genre = classification?.genre?.name?.toLowerCase() || '';

    if (segment.includes('sports')) return 'sports';
    if (segment.includes('music') || genre.includes('concert')) return 'concert';
    if (segment.includes('arts') || genre.includes('festival')) return 'festival';
    if (segment.includes('miscellaneous')) return 'conference';
    return 'other';
  }

  private estimateAttendance(event: any, venue: any): number {
    // Use venue capacity if available, otherwise estimate based on category
    const capacity = venue?.capacity || 0;
    if (capacity > 0) return Math.floor(capacity * 0.7); // Assume 70% attendance

    const category = this.categorizeEvent(event.classifications?.[0]);
    const baseAttendance: Record<string, number> = {
      sports: 5000,
      concert: 2000,
      festival: 3000,
      conference: 500,
      other: 200
    };

    return baseAttendance[category] || 200;
  }

  private calculateImpactLevel(
    distance: number,
    attendance: number,
    category: LocalEvent['category']
  ): LocalEvent['impactLevel'] {
    // Closer events and larger attendance = higher impact
    let score = 0;

    // Distance scoring (0-40 points)
    if (distance < 0.5) score += 40;
    else if (distance < 1) score += 30;
    else if (distance < 2) score += 20;
    else if (distance < 5) score += 10;

    // Attendance scoring (0-40 points)
    if (attendance > 10000) score += 40;
    else if (attendance > 5000) score += 30;
    else if (attendance > 1000) score += 20;
    else if (attendance > 500) score += 10;

    // Category scoring (0-20 points)
    const categoryScores: Record<string, number> = {
      sports: 20,
      festival: 15,
      concert: 15,
      conference: 10,
      other: 5
    };
    score += categoryScores[category] || 0;

    // Determine impact level
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

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

// ============================================================================
// HOLIDAYS & SPECIAL DAYS
// ============================================================================

export interface HolidayData {
  date: Date;
  name: string;
  type: 'federal' | 'cultural' | 'religious' | 'commercial' | 'sporting';
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  diningImpact: 'negative' | 'neutral' | 'positive' | 'very_positive';
  description: string;
  typicalBehavior: string; // How customers typically behave
}

export class HolidayService {
  private holidays: HolidayData[] = [];

  constructor() {
    this.initializeHolidays();
  }

  /**
   * Get holiday for a specific date
   */
  getHoliday(date: Date): HolidayData | null {
    const dateStr = this.formatDate(date);
    return this.holidays.find(h => this.formatDate(h.date) === dateStr) || null;
  }

  /**
   * Get holidays in a date range
   */
  getHolidaysInRange(startDate: Date, endDate: Date): HolidayData[] {
    return this.holidays.filter(h => h.date >= startDate && h.date <= endDate);
  }

  /**
   * Check if date is a holiday
   */
  isHoliday(date: Date): boolean {
    return this.getHoliday(date) !== null;
  }

  /**
   * Get upcoming holidays
   */
  getUpcomingHolidays(count: number = 5): HolidayData[] {
    const now = new Date();
    return this.holidays
      .filter(h => h.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, count);
  }

  private initializeHolidays() {
    const year = new Date().getFullYear();

    // Major US holidays and their dining impact
    this.holidays = [
      // Q1
      {
        date: new Date(year, 0, 1),
        name: "New Year's Day",
        type: 'federal',
        impactLevel: 'critical',
        diningImpact: 'positive',
        description: 'Federal holiday celebrating the new year',
        typicalBehavior: 'Brunch crowds, recovery meals, increased spending'
      },
      {
        date: new Date(year, 0, 15),
        name: "Martin Luther King Jr. Day",
        type: 'federal',
        impactLevel: 'medium',
        diningImpact: 'neutral',
        description: 'Federal holiday honoring MLK Jr.',
        typicalBehavior: 'Day off for some, normal patterns for others'
      },
      {
        date: new Date(year, 1, 14),
        name: "Valentine's Day",
        type: 'commercial',
        impactLevel: 'critical',
        diningImpact: 'very_positive',
        description: 'Romance and dining holiday',
        typicalBehavior: 'Dinner rush, couples, reservations essential, high tickets'
      },
      {
        date: new Date(year, 1, 17),
        name: "Presidents Day",
        type: 'federal',
        impactLevel: 'medium',
        diningImpact: 'positive',
        description: 'Federal holiday',
        typicalBehavior: 'Family dining, day trips increase traffic'
      },
      {
        date: new Date(year, 2, 17),
        name: "St. Patrick's Day",
        type: 'cultural',
        impactLevel: 'high',
        diningImpact: 'very_positive',
        description: 'Irish cultural celebration',
        typicalBehavior: 'Heavy drinking crowds, Irish food demand, late night traffic'
      },

      // Q2
      {
        date: this.getEasterDate(year),
        name: 'Easter Sunday',
        type: 'religious',
        impactLevel: 'critical',
        diningImpact: 'very_positive',
        description: 'Christian holiday',
        typicalBehavior: 'Brunch crowds, family gatherings, upscale dining'
      },
      {
        date: new Date(year, 4, 12),
        name: "Mother's Day",
        type: 'commercial',
        impactLevel: 'critical',
        diningImpact: 'very_positive',
        description: 'Honoring mothers',
        typicalBehavior: 'Busiest brunch day of year, reservations required, high tickets'
      },
      {
        date: new Date(year, 4, -1),
        name: 'Memorial Day',
        type: 'federal',
        impactLevel: 'high',
        diningImpact: 'positive',
        description: 'Federal holiday',
        typicalBehavior: 'BBQ competition, outdoor dining, family gatherings'
      },
      {
        date: new Date(year, 5, 16),
        name: "Father's Day",
        type: 'commercial',
        impactLevel: 'high',
        diningImpact: 'very_positive',
        description: 'Honoring fathers',
        typicalBehavior: 'Brunch and dinner crowds, steakhouse demand, family groups'
      },
      {
        date: new Date(year, 5, 19),
        name: 'Juneteenth',
        type: 'federal',
        impactLevel: 'medium',
        diningImpact: 'neutral',
        description: 'Freedom Day',
        typicalBehavior: 'Cultural celebrations, some communities very active'
      },

      // Q3
      {
        date: new Date(year, 6, 4),
        name: 'Independence Day',
        type: 'federal',
        impactLevel: 'critical',
        diningImpact: 'negative',
        description: 'July 4th',
        typicalBehavior: 'BBQs at home, restaurant dining decreases, outdoor events'
      },
      {
        date: this.getLaborDay(year),
        name: 'Labor Day',
        type: 'federal',
        impactLevel: 'high',
        diningImpact: 'positive',
        description: 'End of summer',
        typicalBehavior: 'Last summer weekend, BBQ demand, outdoor dining'
      },

      // Q4
      {
        date: new Date(year, 9, 31),
        name: 'Halloween',
        type: 'cultural',
        impactLevel: 'medium',
        diningImpact: 'neutral',
        description: 'Halloween celebrations',
        typicalBehavior: 'Early family dining, late night party crowds'
      },
      {
        date: new Date(year, 10, 11),
        name: 'Veterans Day',
        type: 'federal',
        impactLevel: 'medium',
        diningImpact: 'neutral',
        description: 'Honoring veterans',
        typicalBehavior: 'Veterans discounts, normal to slight uptick'
      },
      {
        date: this.getThanksgiving(year),
        name: 'Thanksgiving',
        type: 'federal',
        impactLevel: 'critical',
        diningImpact: 'negative',
        description: 'Thanksgiving Day',
        typicalBehavior: 'Home cooking dominates, restaurants mostly closed or slow'
      },
      {
        date: this.getBlackFriday(year),
        name: 'Black Friday',
        type: 'commercial',
        impactLevel: 'high',
        diningImpact: 'positive',
        description: 'Shopping day',
        typicalBehavior: 'Shoppers need meals, lunch rush, quick service demand'
      },
      {
        date: new Date(year, 11, 24),
        name: 'Christmas Eve',
        type: 'religious',
        impactLevel: 'high',
        diningImpact: 'negative',
        description: 'Christmas Eve',
        typicalBehavior: 'Family at home, early closures, minimal traffic'
      },
      {
        date: new Date(year, 11, 25),
        name: 'Christmas Day',
        type: 'federal',
        impactLevel: 'critical',
        diningImpact: 'negative',
        description: 'Christmas',
        typicalBehavior: 'Closed or very slow, family gatherings at home'
      },
      {
        date: new Date(year, 11, 31),
        name: "New Year's Eve",
        type: 'cultural',
        impactLevel: 'critical',
        diningImpact: 'very_positive',
        description: 'NYE celebrations',
        typicalBehavior: 'Party crowds, late night, high tickets, reservations essential'
      },

      // Sporting Events
      {
        date: this.getSuperBowlSunday(year),
        name: 'Super Bowl Sunday',
        type: 'sporting',
        impactLevel: 'critical',
        diningImpact: 'negative',
        description: 'Super Bowl',
        typicalBehavior: 'Takeout surge, dine-in dies, wings/pizza demand spikes'
      }
    ];
  }

  private getEasterDate(year: number): Date {
    // Easter calculation (Computus algorithm)
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
  }

  private getSuperBowlSunday(year: number): Date {
    // Super Bowl is first Sunday in February
    const feb = new Date(year, 1, 1);
    const day = feb.getDay();
    const firstSunday = day === 0 ? 1 : 8 - day;
    return new Date(year, 1, firstSunday);
  }

  private getThanksgiving(year: number): Date {
    // Fourth Thursday in November
    const nov = new Date(year, 10, 1);
    const day = nov.getDay();
    const firstThursday = day <= 4 ? 5 - day : 12 - day;
    return new Date(year, 10, firstThursday + 21);
  }

  private getBlackFriday(year: number): Date {
    const thanksgiving = this.getThanksgiving(year);
    return new Date(thanksgiving.getTime() + 24 * 60 * 60 * 1000);
  }

  private getLaborDay(year: number): Date {
    // First Monday in September
    const sep = new Date(year, 8, 1);
    const day = sep.getDay();
    const firstMonday = day === 1 ? 1 : day === 0 ? 2 : 9 - day;
    return new Date(year, 8, firstMonday);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCES
// ============================================================================

export const weatherService = new WeatherService();
export const eventsService = new EventsService();
export const holidayService = new HolidayService();
