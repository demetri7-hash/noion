"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sportsService = exports.holidayService = exports.eventsService = exports.weatherService = exports.SportsService = exports.HolidayService = exports.EventsService = exports.WeatherService = void 0;
const axios_1 = __importDefault(require("axios"));
class WeatherService {
    constructor() {
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.apiKey = process.env.OPENWEATHER_API_KEY || '';
    }
    /**
     * Get current weather for location
     */
    async getCurrentWeather(lat, lon) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/weather`, {
                params: {
                    lat,
                    lon,
                    appid: this.apiKey,
                    units: 'imperial' // Fahrenheit
                }
            });
            return this.parseWeatherResponse(response.data);
        }
        catch (error) {
            console.error('Weather API error:', error);
            return null;
        }
    }
    /**
     * Get historical weather data
     */
    async getHistoricalWeather(lat, lon, timestamp) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/onecall/timemachine`, {
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
        }
        catch (error) {
            console.error('Historical weather error:', error);
            return null;
        }
    }
    /**
     * Get weather forecast
     */
    async getWeatherForecast(lat, lon, days = 7) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/forecast`, {
                params: {
                    lat,
                    lon,
                    appid: this.apiKey,
                    units: 'imperial',
                    cnt: days * 8 // 3-hour intervals
                }
            });
            return response.data.list.map((item) => this.parseWeatherResponse(item));
        }
        catch (error) {
            console.error('Weather forecast error:', error);
            return [];
        }
    }
    parseWeatherResponse(data) {
        const temp = data.main.temp;
        const condition = data.weather[0].main.toLowerCase();
        const description = data.weather[0].description;
        const isRaining = condition.includes('rain') || condition.includes('drizzle');
        const isSnowing = condition.includes('snow');
        const isClear = condition === 'clear';
        const isExtreme = temp < 32 || temp > 95 || condition.includes('thunderstorm');
        let weatherCategory;
        if (isExtreme) {
            weatherCategory = 'severe';
        }
        else if (isRaining || isSnowing) {
            weatherCategory = 'poor';
        }
        else if (condition === 'clouds') {
            weatherCategory = 'fair';
        }
        else if (isClear && temp >= 65 && temp <= 85) {
            weatherCategory = 'excellent';
        }
        else {
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
exports.WeatherService = WeatherService;
class EventsService {
    constructor() {
        this.ticketmasterBaseUrl = 'https://app.ticketmaster.com/discovery/v2';
        this.apiKey = process.env.TICKETMASTER_API_KEY || '';
    }
    /**
     * Get local events near a location
     */
    async getLocalEvents(lat, lon, radiusMiles = 5, startDate, endDate) {
        try {
            const params = {
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
            const response = await axios_1.default.get(`${this.ticketmasterBaseUrl}/events`, {
                params
            });
            return this.parseEventsResponse(response.data, lat, lon);
        }
        catch (error) {
            console.error('Events API error:', error);
            return [];
        }
    }
    /**
     * Get major events that could impact traffic
     */
    async getMajorEvents(lat, lon, date) {
        const events = await this.getLocalEvents(lat, lon, 10, // 10 mile radius for major events
        date, new Date(date.getTime() + 24 * 60 * 60 * 1000));
        // Filter for major events only
        return events.filter(event => event.expectedAttendance > 1000 ||
            event.category === 'sports' ||
            event.category === 'festival');
    }
    parseEventsResponse(data, restaurantLat, restaurantLon) {
        if (!data._embedded?.events)
            return [];
        return data._embedded.events.map((event) => {
            const venue = event._embedded?.venues?.[0];
            const venueLat = parseFloat(venue?.location?.latitude || 0);
            const venueLon = parseFloat(venue?.location?.longitude || 0);
            const distance = this.calculateDistance(restaurantLat, restaurantLon, venueLat, venueLon);
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
    categorizeEvent(classification) {
        const segment = classification?.segment?.name?.toLowerCase() || '';
        const genre = classification?.genre?.name?.toLowerCase() || '';
        if (segment.includes('sports'))
            return 'sports';
        if (segment.includes('music') || genre.includes('concert'))
            return 'concert';
        if (segment.includes('arts') || genre.includes('festival'))
            return 'festival';
        if (segment.includes('miscellaneous'))
            return 'conference';
        return 'other';
    }
    estimateAttendance(event, venue) {
        // Use venue capacity if available, otherwise estimate based on category
        const capacity = venue?.capacity || 0;
        if (capacity > 0)
            return Math.floor(capacity * 0.7); // Assume 70% attendance
        const category = this.categorizeEvent(event.classifications?.[0]);
        const baseAttendance = {
            sports: 5000,
            concert: 2000,
            festival: 3000,
            conference: 500,
            other: 200
        };
        return baseAttendance[category] || 200;
    }
    calculateImpactLevel(distance, attendance, category) {
        // Closer events and larger attendance = higher impact
        let score = 0;
        // Distance scoring (0-40 points)
        if (distance < 0.5)
            score += 40;
        else if (distance < 1)
            score += 30;
        else if (distance < 2)
            score += 20;
        else if (distance < 5)
            score += 10;
        // Attendance scoring (0-40 points)
        if (attendance > 10000)
            score += 40;
        else if (attendance > 5000)
            score += 30;
        else if (attendance > 1000)
            score += 20;
        else if (attendance > 500)
            score += 10;
        // Category scoring (0-20 points)
        const categoryScores = {
            sports: 20,
            festival: 15,
            concert: 15,
            conference: 10,
            other: 5
        };
        score += categoryScores[category] || 0;
        // Determine impact level
        if (score >= 75)
            return 'critical';
        if (score >= 50)
            return 'high';
        if (score >= 25)
            return 'medium';
        return 'low';
    }
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3959; // Earth's radius in miles
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
}
exports.EventsService = EventsService;
class HolidayService {
    constructor() {
        this.holidays = [];
        this.initializeHolidays();
    }
    /**
     * Get holiday for a specific date
     */
    getHoliday(date) {
        const dateStr = this.formatDate(date);
        return this.holidays.find(h => this.formatDate(h.date) === dateStr) || null;
    }
    /**
     * Get holidays in a date range
     */
    getHolidaysInRange(startDate, endDate) {
        return this.holidays.filter(h => h.date >= startDate && h.date <= endDate);
    }
    /**
     * Check if date is a holiday
     */
    isHoliday(date) {
        return this.getHoliday(date) !== null;
    }
    /**
     * Get upcoming holidays
     */
    getUpcomingHolidays(count = 5) {
        const now = new Date();
        return this.holidays
            .filter(h => h.date >= now)
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(0, count);
    }
    initializeHolidays() {
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
    getEasterDate(year) {
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
    getSuperBowlSunday(year) {
        // Super Bowl is first Sunday in February
        const feb = new Date(year, 1, 1);
        const day = feb.getDay();
        const firstSunday = day === 0 ? 1 : 8 - day;
        return new Date(year, 1, firstSunday);
    }
    getThanksgiving(year) {
        // Fourth Thursday in November
        const nov = new Date(year, 10, 1);
        const day = nov.getDay();
        const firstThursday = day <= 4 ? 5 - day : 12 - day;
        return new Date(year, 10, firstThursday + 21);
    }
    getBlackFriday(year) {
        const thanksgiving = this.getThanksgiving(year);
        return new Date(thanksgiving.getTime() + 24 * 60 * 60 * 1000);
    }
    getLaborDay(year) {
        // First Monday in September
        const sep = new Date(year, 8, 1);
        const day = sep.getDay();
        const firstMonday = day === 1 ? 1 : day === 0 ? 2 : 9 - day;
        return new Date(year, 8, firstMonday);
    }
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
}
exports.HolidayService = HolidayService;
class SportsService {
    constructor() {
        this.theSportsDbKey = '3'; // Free tier key
        this.baseUrl = 'https://www.thesportsdb.com/api/v1/json/3';
        // Major US sports team locations (lat/lon for distance calc)
        this.teamLocations = new Map([
            // NFL
            ['San Francisco 49ers', { lat: 37.4032, lon: -121.9696, city: 'Santa Clara' }],
            ['Los Angeles Rams', { lat: 34.0141, lon: -118.2879, city: 'Los Angeles' }],
            ['Los Angeles Chargers', { lat: 34.0141, lon: -118.2879, city: 'Los Angeles' }],
            ['Las Vegas Raiders', { lat: 36.0909, lon: -115.1833, city: 'Las Vegas' }],
            ['Seattle Seahawks', { lat: 47.5952, lon: -122.3316, city: 'Seattle' }],
            // NBA
            ['Sacramento Kings', { lat: 38.5802, lon: -121.4997, city: 'Sacramento' }],
            ['Golden State Warriors', { lat: 37.7680, lon: -122.3877, city: 'San Francisco' }],
            ['Los Angeles Lakers', { lat: 34.0430, lon: -118.2673, city: 'Los Angeles' }],
            ['Los Angeles Clippers', { lat: 34.0430, lon: -118.2673, city: 'Los Angeles' }],
            // MLB
            ['San Francisco Giants', { lat: 37.7786, lon: -122.3893, city: 'San Francisco' }],
            ['Oakland Athletics', { lat: 37.7516, lon: -122.2005, city: 'Oakland' }],
            ['Los Angeles Dodgers', { lat: 34.0739, lon: -118.2400, city: 'Los Angeles' }],
            ['Los Angeles Angels', { lat: 33.8003, lon: -117.8827, city: 'Anaheim' }],
            ['San Diego Padres', { lat: 32.7073, lon: -117.1566, city: 'San Diego' }],
            // NHL
            ['San Jose Sharks', { lat: 37.3327, lon: -121.9010, city: 'San Jose' }],
            ['Anaheim Ducks', { lat: 33.8075, lon: -117.8765, city: 'Anaheim' }],
            ['Los Angeles Kings', { lat: 34.0430, lon: -118.2673, city: 'Los Angeles' }],
        ]);
    }
    /**
     * Get games on a specific date near a location
     */
    async getGamesOnDate(date, restaurantLat, restaurantLon, radiusMiles = 50) {
        const games = [];
        // Format date for API (YYYY-MM-DD)
        const dateStr = date.toISOString().split('T')[0];
        // Fetch games from each league
        const leagues = [
            { name: 'NFL', id: '4391' },
            { name: 'NBA', id: '4387' },
            { name: 'MLB', id: '4424' },
            { name: 'NHL', id: '4380' },
        ];
        for (const league of leagues) {
            try {
                const leagueGames = await this.getLeagueGamesOnDate(league.name, league.id, dateStr, restaurantLat, restaurantLon, radiusMiles);
                games.push(...leagueGames);
            }
            catch (error) {
                console.error(`Error fetching ${league.name} games:`, error);
            }
        }
        return games.sort((a, b) => a.distance - b.distance);
    }
    /**
     * Get games for a specific league on a date
     */
    async getLeagueGamesOnDate(league, leagueId, dateStr, restaurantLat, restaurantLon, radiusMiles) {
        try {
            // TheSportsDB format: eventsbyleague
            const response = await axios_1.default.get(`${this.baseUrl}/eventsday.php?d=${dateStr}&l=${leagueId}`);
            if (!response.data?.events) {
                return [];
            }
            const games = [];
            for (const event of response.data.events) {
                const homeTeam = event.strHomeTeam;
                const awayTeam = event.strAwayTeam;
                // Get venue location
                const teamLocation = this.teamLocations.get(homeTeam);
                if (!teamLocation)
                    continue; // Skip if we don't have location data
                // Calculate distance
                const distance = this.calculateDistance(restaurantLat, restaurantLon, teamLocation.lat, teamLocation.lon);
                // Only include games within radius
                if (distance > radiusMiles)
                    continue;
                const gameDate = new Date(event.strTimestamp || event.dateEvent);
                // Determine if it's a local team
                const isLocalHomeGame = distance < 30;
                // Check if rivalry game (simple heuristic - can be improved)
                const isRivalry = this.isRivalryGame(homeTeam, awayTeam);
                // Estimate attendance based on venue/league
                const expectedAttendance = this.estimateAttendance(league, event.intSpectators);
                games.push({
                    id: event.idEvent,
                    league,
                    homeTeam,
                    awayTeam,
                    homeTeamId: event.idHomeTeam,
                    awayTeamId: event.idAwayTeam,
                    gameDate,
                    venue: event.strVenue || teamLocation.city,
                    venueLat: teamLocation.lat,
                    venueLon: teamLocation.lon,
                    status: this.parseGameStatus(event.strStatus),
                    homeScore: event.intHomeScore ? parseInt(event.intHomeScore) : undefined,
                    awayScore: event.intAwayScore ? parseInt(event.intAwayScore) : undefined,
                    expectedAttendance,
                    distance,
                    impactLevel: this.calculateSportsImpact(distance, expectedAttendance, isLocalHomeGame, isRivalry, league),
                    isHomeGame: isLocalHomeGame,
                    isRivalry,
                    teamPopularity: this.getTeamPopularity(homeTeam)
                });
            }
            return games;
        }
        catch (error) {
            console.error(`Error fetching ${league} schedule:`, error);
            return [];
        }
    }
    /**
     * Check if this is a rivalry game
     */
    isRivalryGame(homeTeam, awayTeam) {
        const rivalries = [
            // NFL
            ['San Francisco 49ers', 'Seattle Seahawks'],
            ['San Francisco 49ers', 'Los Angeles Rams'],
            ['Oakland Raiders', 'Kansas City Chiefs'],
            // NBA
            ['Los Angeles Lakers', 'Los Angeles Clippers'],
            ['Golden State Warriors', 'Los Angeles Lakers'],
            ['Sacramento Kings', 'Golden State Warriors'],
            // MLB
            ['San Francisco Giants', 'Los Angeles Dodgers'],
            ['Oakland Athletics', 'San Francisco Giants'],
            // NHL
            ['San Jose Sharks', 'Los Angeles Kings'],
            ['Anaheim Ducks', 'Los Angeles Kings'],
        ];
        return rivalries.some(([team1, team2]) => (homeTeam === team1 && awayTeam === team2) ||
            (homeTeam === team2 && awayTeam === team1));
    }
    /**
     * Get team popularity in the area
     */
    getTeamPopularity(teamName) {
        // Major market teams
        const highPopularity = [
            'Golden State Warriors',
            'Los Angeles Lakers',
            'San Francisco 49ers',
            'Los Angeles Dodgers',
            'Sacramento Kings'
        ];
        const mediumPopularity = [
            'San Francisco Giants',
            'Los Angeles Rams',
            'Los Angeles Clippers',
            'San Jose Sharks'
        ];
        if (highPopularity.includes(teamName))
            return 'high';
        if (mediumPopularity.includes(teamName))
            return 'medium';
        return 'low';
    }
    /**
     * Calculate sports event impact on restaurant
     */
    calculateSportsImpact(distance, attendance, isHomeGame, isRivalry, league) {
        let score = 0;
        // Distance scoring (0-30 points)
        if (distance < 1)
            score += 30;
        else if (distance < 5)
            score += 25;
        else if (distance < 10)
            score += 15;
        else if (distance < 30)
            score += 8;
        // Home game bonus (0-20 points)
        if (isHomeGame)
            score += 20;
        // Attendance (0-20 points)
        if (attendance > 50000)
            score += 20;
        else if (attendance > 30000)
            score += 15;
        else if (attendance > 15000)
            score += 10;
        else
            score += 5;
        // Rivalry bonus (0-15 points)
        if (isRivalry)
            score += 15;
        // League popularity (0-15 points)
        const leagueScores = { NFL: 15, NBA: 12, MLB: 10, NHL: 8, MLS: 5 };
        score += leagueScores[league] || 5;
        // Determine impact
        if (score >= 70)
            return 'critical';
        if (score >= 50)
            return 'high';
        if (score >= 30)
            return 'medium';
        return 'low';
    }
    /**
     * Estimate game attendance
     */
    estimateAttendance(league, reported) {
        if (reported) {
            const parsed = parseInt(reported);
            if (!isNaN(parsed))
                return parsed;
        }
        // Average attendance by league
        const averages = {
            NFL: 67000,
            MLB: 28000,
            NBA: 17500,
            NHL: 17000,
            MLS: 21000
        };
        return averages[league] || 20000;
    }
    /**
     * Parse game status
     */
    parseGameStatus(status) {
        if (!status)
            return 'scheduled';
        const lower = status.toLowerCase();
        if (lower.includes('postponed') || lower.includes('cancelled'))
            return 'postponed';
        if (lower.includes('final') || lower.includes('ft'))
            return 'completed';
        if (lower.includes('live') || lower.includes('progress'))
            return 'in_progress';
        return 'scheduled';
    }
    /**
     * Calculate distance between two coordinates
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3959; // Earth's radius in miles
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
    /**
     * Get upcoming games for local teams
     */
    async getUpcomingLocalGames(restaurantLat, restaurantLon, days = 7, radiusMiles = 30) {
        const allGames = [];
        const today = new Date();
        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dayGames = await this.getGamesOnDate(date, restaurantLat, restaurantLon, radiusMiles);
            allGames.push(...dayGames);
        }
        return allGames;
    }
}
exports.SportsService = SportsService;
// ============================================================================
// EXPORT SINGLETON INSTANCES
// ============================================================================
exports.weatherService = new WeatherService();
exports.eventsService = new EventsService();
exports.holidayService = new HolidayService();
exports.sportsService = new SportsService();
