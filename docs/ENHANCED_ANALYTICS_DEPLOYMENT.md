# Enhanced Analytics System - Deployment Guide

## ✅ What's Been Built

### Core Services (7 new files)
1. **ExternalDataService.ts** - Weather, Events, Holidays integration
2. **LocationService.ts** - Restaurant location from Toast API + geocoding
3. **CorrelationEngine.ts** - Pattern discovery & validation engine
4. **EnhancedInsightsService.ts** - Orchestration service
5. **MenuAnalyticsService.ts** - Menu-specific upsell analysis
6. **Correlation.ts** (Model) - Pattern storage with learning metrics
7. **ExternalContext.ts** (Model) - Cached external data

### API Endpoints (5 new routes)
1. `GET /api/analytics/enhanced-insights` - Full enhanced insights
2. `GET /api/analytics/menu-insights` - Menu upsell opportunities
3. `GET /api/analytics/correlations` - View discovered patterns
4. `GET /api/analytics/predictions` - Predictions for upcoming dates
5. `POST /api/analytics/correlations/discover` - Trigger pattern discovery

### Background Jobs
1. **Nightly Cron Job** - Automatic correlation discovery at 2 AM
2. **Global Learning** - Cross-restaurant pattern aggregation

### Testing & Documentation
1. **test-apis.sh** - Quick API endpoint tests
2. **test-enhanced-analytics.ts** - Comprehensive service tests
3. **discover-correlations.ts** - Manual correlation discovery script
4. **ENHANCED_ANALYTICS_SYSTEM.md** - Complete technical documentation

---

## 🔑 API Keys Required

All three API keys are already in your `.env.local`:

```bash
OPENWEATHER_API_KEY=bfcb0efd46ff675c5da542bcd138f2da
TICKETMASTER_API_KEY=6CAbXYWtXxADpKR9dDDFCrIqdjUzT41Q
GOOGLE_GEOCODING_API_KEY=AIzaSyCTo20k4cjX4HsUw6bE2x9FPVt7DvKNJFo
```

---

## 📦 Deployment Steps

### Step 1: Add Environment Variables to Vercel

Go to your Vercel dashboard → Project → Settings → Environment Variables

Add these three variables:
- `OPENWEATHER_API_KEY` = `bfcb0efd46ff675c5da542bcd138f2da`
- `TICKETMASTER_API_KEY` = `6CAbXYWtXxADpKR9dDDFCrIqdjUzT41Q`
- `GOOGLE_GEOCODING_API_KEY` = `AIzaSyCTo20k4cjX4HsUw6bE2x9FPVt7DvKNJFo`

Make sure to add them for **Production**, **Preview**, and **Development** environments.

### Step 2: Optional - Add Cron Secret

For added security on the nightly cron job:

1. Generate a random string: `openssl rand -hex 32`
2. Add `CRON_SECRET` to Vercel environment variables
3. The cron endpoint will validate the secret

### Step 3: Deploy

```bash
git add .
git commit -m "Add enhanced analytics system"
git push
```

Vercel will automatically deploy.

### Step 4: Verify Deployment

Once deployed, test the APIs:

```bash
# Replace TOKEN with your actual auth token
TOKEN="your-auth-token-here"

# Test enhanced insights
curl -X GET "https://your-app.vercel.app/api/analytics/enhanced-insights" \
  -H "Authorization: Bearer $TOKEN"

# Test menu insights
curl -X GET "https://your-app.vercel.app/api/analytics/menu-insights" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🧪 Local Testing

### Test API Endpoints

Start the dev server:
```bash
npm run dev
```

Run the test script:
```bash
./scripts/test-apis.sh
```

This will test all 5 API endpoints and show the responses.

### Test Services Directly

To test the services without running the server:
```bash
npx ts-node -r tsconfig-paths/register scripts/discover-correlations.ts
```

---

## 🔄 How It Works

### Automatic Learning (Nightly)

Every night at 2 AM, the system:
1. Analyzes last 90 days of transaction data
2. Fetches historical weather, events, holidays
3. Calculates correlations (Pearson coefficient)
4. Validates existing patterns
5. Creates/updates patterns in database
6. Contributes to global learning (cross-restaurant intelligence)

### On-Demand Insights

When you request insights via API:
1. Fetches current weather + 7-day forecast
2. Gets upcoming local events (10-mile radius)
3. Gets next 5 holidays
4. Applies learned patterns to make predictions
5. Generates contextual recommendations
6. Returns comprehensive enhanced insights

### Menu-Specific Analysis

When analyzing menu:
1. Extracts all menu items from transaction history
2. Calculates co-occurrence patterns (market basket analysis)
3. Finds items frequently ordered together
4. Calculates missed revenue opportunities
5. Generates actionable upsell recommendations with real menu items

---

## 📊 What You'll Get

### Enhanced Insights Response

```json
{
  "success": true,
  "data": {
    "findings": [
      {
        "category": "REVENUE_OPTIMIZATION",
        "title": "Excellent Weather Opportunity",
        "description": "Perfect weather (72°F, clear sky). Ideal for outdoor dining.",
        "impact": { "type": "revenue", "value": 300, "unit": "$" },
        "confidenceScore": 80
      },
      {
        "category": "REVENUE_OPTIMIZATION",
        "title": "Major Event: Lakers vs Warriors",
        "description": "20,000 expected, 0.8 miles away. High traffic expected.",
        "impact": { "type": "revenue", "value": 1000, "unit": "$" }
      }
    ],
    "recommendations": [
      {
        "title": "Event Strategy: Lakers vs Warriors",
        "description": "Increase inventory, add extra staff, create game specials",
        "implementation": {
          "difficulty": "medium",
          "roi": { "expectedReturn": 2000, "probability": 80 }
        },
        "steps": [...]
      }
    ],
    "contextualFactors": {
      "weather": {
        "current": { "temperature": 72, "description": "clear sky" },
        "forecast": [...]
      },
      "upcomingEvents": [...],
      "upcomingHolidays": [...]
    },
    "predictions": [
      {
        "metric": "revenue",
        "predictedValue": 3500,
        "baseline": 3000,
        "change": 16.7,
        "confidence": 85,
        "factors": [
          { "type": "weather", "description": "Perfect weather", "impact": 10 },
          { "type": "event", "description": "Major sporting event", "impact": 15 }
        ]
      }
    ],
    "patterns": [
      {
        "description": "When temperature is above 75°F, revenue increases by 12%",
        "confidence": 88,
        "basedOnRestaurants": 45,
        "accuracy": 91
      }
    ]
  }
}
```

### Menu Insights Response

```json
{
  "success": true,
  "data": {
    "insights": {
      "topItems": [
        { "name": "Classic Burger", "frequency": 450, "price": 12.99 },
        { "name": "Caesar Salad", "frequency": 380, "price": 9.99 }
      ],
      "upsellOpportunities": [
        {
          "baseItem": { "name": "Classic Burger", "price": 12.99 },
          "suggestedItem": { "name": "French Fries", "price": 4.99 },
          "pattern": {
            "description": "35% of customers who order Classic Burger also order French Fries",
            "attachRate": 0.35,
            "whenOrdered": "When customer orders Classic Burger",
            "alsoOrdered": "35% also order French Fries"
          },
          "missedOpportunities": {
            "totalBaseOrders": 180,
            "ordersWithoutUpsell": 117,
            "missedMonthly": 585
          },
          "revenueImpact": {
            "ifUpsoldAt50Percent": 607,
            "ifUpsoldAt75Percent": 754,
            "missedMonthly": 585
          },
          "recommendation": {
            "title": "Upsell French Fries with Classic Burger",
            "implementation": "Train staff to ask: 'Would you like to add French Fries to your Classic Burger?'",
            "expectedRevenue": 292
          }
        }
      ],
      "bundleOpportunities": [...]
    },
    "report": {
      "summary": "Found 12 upsell opportunities worth $4,500/month...",
      "topOpportunities": [...],
      "quickWins": [...],
      "totalPotential": 4500
    }
  }
}
```

---

## 🎯 Next Steps

### 1. Build UI Components
Create dashboard pages to visualize:
- Enhanced insights with weather/events context
- Menu upsell opportunities
- Correlation patterns
- Predictions timeline

### 2. Add Notifications
- Email alerts for major events
- Push notifications for high-impact predictions
- Daily digest of insights

### 3. A/B Testing
Track recommendation effectiveness:
- Which upsells were tried
- Success rates
- Revenue attribution

### 4. Mobile App
Expose APIs for mobile notifications and quick insights

---

## 🔧 Troubleshooting

### API Keys Not Working

1. Check Vercel environment variables are set
2. Verify keys are valid at provider websites
3. Check server logs for API errors

### No Patterns Discovered

- System needs transaction data (minimum 30 days)
- Run manual discovery: `POST /api/analytics/correlations/discover`
- Check database has `correlations` collection

### Predictions Not Accurate

- System learns over time (improves with more restaurants)
- Validate patterns are being discovered
- Check `learning.accuracy` field in correlations

---

## 📖 Additional Documentation

- **Technical Details**: `docs/ENHANCED_ANALYTICS_SYSTEM.md`
- **Service Architecture**: See service files in `src/services/`
- **API Reference**: See route files in `src/app/api/analytics/`

---

## 🚀 Pro Tips

1. **Run discovery manually** after importing bulk transaction data
2. **Monitor correlation accuracy** to see system improving
3. **Check predictions daily** to prepare for events/weather
4. **Review menu insights weekly** to update staff training
5. **Contribute to global learning** - more restaurants = smarter system
