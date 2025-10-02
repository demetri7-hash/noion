# Background Jobs Setup Guide

This document explains how to set up and deploy the background job system for POS data synchronization.

## Architecture Overview

```
User Clicks "Connect POS"
    ↓
API creates job in Redis queue
    ↓
Returns immediately (no waiting!)
    ↓
Background worker picks up job
    ↓
Processes sync (can take minutes)
    ↓
Sends email when complete
```

## Components

1. **BullMQ Queue** - Redis-based job queue
2. **Background Worker** - Separate service that processes jobs
3. **SyncJob Model** - MongoDB tracking for job status
4. **Email Service** - SendGrid notifications
5. **Status API** - Check job progress

---

## Setup Instructions

### Step 1: Redis (Required)

#### Option A: Upstash (Recommended - Free Tier)

1. Go to https://upstash.com
2. Sign up for free account
3. Create new Redis database
4. Copy the Redis URL
5. Add to Vercel environment variables:
   ```
   REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_HOST.upstash.io:6379
   ```

#### Option B: Redis Cloud

1. Go to https://redis.com/try-free/
2. Create free account
3. Create database
4. Get connection URL
5. Add to environment variables

### Step 2: SendGrid (Email Notifications)

1. Go to https://sendgrid.com
2. Sign up (free tier: 100 emails/day)
3. Create API key (Settings → API Keys)
4. Add to Vercel environment variables:
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   SENDGRID_FROM_NAME=NOION Analytics
   ```

### Step 3: Deploy Background Worker

#### Option A: Railway (Recommended - Free)

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add service → Add a new service
6. Name it "worker"
7. Configure build command:
   ```
   npm install && npm run build
   ```
8. Configure start command:
   ```
   npm run worker
   ```
9. Add environment variables (same as Vercel):
   - `MONGODB_URI`
   - `REDIS_URL`
   - `SENDGRID_API_KEY`
   - `SENDGRID_FROM_EMAIL`
   - `TOAST_CLIENT_ID`
   - `TOAST_CLIENT_SECRET`
10. Deploy!

#### Option B: Render (Also Free)

1. Go to https://render.com
2. Sign up
3. New → Background Worker
4. Connect your repository
5. Configure:
   - Name: `noion-worker`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run worker`
6. Add environment variables
7. Create web service

### Step 4: Update Environment Variables

Add these to both **Vercel** (for API) and **Railway/Render** (for worker):

```bash
# Required
MONGODB_URI=mongodb+srv://...
REDIS_URL=rediss://...

# SendGrid
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@noion.ai
SENDGRID_FROM_NAME=NOION Analytics

# Toast POS
TOAST_CLIENT_ID=xxxxx
TOAST_CLIENT_SECRET=xxxxx
TOAST_RESTAURANT_GUID=xxxxx

# Optional
FRONTEND_URL=https://noion.ai
SUPPORT_EMAIL=support@noion.ai
NODE_ENV=production
```

---

## How It Works

### User Flow

1. **User clicks "Connect POS"**
   - API: `POST /api/restaurants/:id/connect-pos`
   - Returns immediately with job ID
   - User sees: "We're syncing your data! Check your email in a few minutes."

2. **Background worker picks up job**
   - Worker polls Redis queue every second
   - Processes job (fetches 5,962 orders, ~40 seconds)
   - Updates progress in database

3. **Job completes**
   - Worker sends email via SendGrid
   - "✅ Your 5,962 orders are ready! View Dashboard →"
   - User clicks link, sees full dashboard

### Checking Job Status

Frontend can poll for updates:

```typescript
// GET /api/sync-jobs/:id
{
  "status": "processing",
  "progress": {
    "currentPage": 25,
    "totalPages": 60,
    "ordersProcessed": 2500,
    "estimatedTotal": 6000
  }
}
```

---

## Testing Locally

### 1. Start Redis Locally (Optional)

```bash
# Using Docker
docker run -d -p 6379:6379 redis

# Or use Upstash cloud for testing
```

### 2. Start Worker

```bash
npm run worker
```

You should see:
```
✅ Redis connected successfully
✅ MongoDB connected successfully
✅ Sync queue initialized
🚀 Worker started and listening for jobs...
```

### 3. Start Next.js Dev Server

```bash
npm run dev
```

### 4. Test It

```bash
# Connect POS (enqueues job)
curl -X POST http://localhost:3000/api/restaurants/RESTAURANT_ID/connect-pos \
  -H "Content-Type: application/json" \
  -d '{"posType": "toast"}'

# Check job status
curl http://localhost:3000/api/sync-jobs/SYNC_JOB_ID
```

Watch the worker logs - you'll see it processing!

---

## Monitoring & Debugging

### View Worker Logs

**Railway:**
```bash
railway logs --service worker
```

**Render:**
- Go to dashboard → Select worker → Logs tab

### Common Issues

**"Redis connection failed"**
- Check REDIS_URL is correct
- Verify Upstash database is running
- Check firewall/network rules

**"Worker not picking up jobs"**
- Verify worker is deployed and running
- Check worker logs for errors
- Ensure same REDIS_URL in worker and API

**"Emails not sending"**
- Check SENDGRID_API_KEY is valid
- Verify from email is verified in SendGrid
- Check SendGrid dashboard for delivery errors

---

## Scaling

### Handle More Jobs

Update worker concurrency in `src/worker/index.ts`:

```typescript
const worker = new Worker(
  QUEUE_NAME,
  processSyncJob,
  {
    connection: getRedisConnection(),
    concurrency: 10, // Process 10 jobs simultaneously
  }
);
```

### Multiple Workers

Deploy multiple worker instances on Railway/Render:
- They'll automatically share the queue
- Each picks up different jobs
- No coordination needed!

---

## Production Checklist

- [ ] Redis deployed (Upstash/Redis Cloud)
- [ ] Worker deployed (Railway/Render)
- [ ] SendGrid configured
- [ ] All environment variables set
- [ ] Test sync job end-to-end
- [ ] Email notifications working
- [ ] Monitor worker logs for 24 hours
- [ ] Set up error alerting (optional)

---

## Future Enhancements

- **Progress UI**: Show real-time progress bar
- **Priority Queue**: VIP customers get faster processing
- **Scheduled Syncs**: Daily automatic syncs
- **Retry Logic**: Smarter retry strategies
- **Dashboard**: BullMQ UI for monitoring jobs

---

## Cost Estimate

- **Redis (Upstash Free)**: $0/month
- **Worker (Railway Free)**: $0/month (500 hours/month)
- **SendGrid (Free)**: $0/month (100 emails/day)
- **MongoDB Atlas (Free)**: $0/month

**Total**: $0/month for MVP 🎉

When you scale:
- Redis: ~$10/month (paid tier)
- Worker: ~$5-20/month (depending on usage)
- SendGrid: ~$15/month (40,000 emails)

---

## Support

Questions? Check:
1. Worker logs (Railway/Render dashboard)
2. Vercel logs (for API errors)
3. Redis dashboard (Upstash)
4. SendGrid dashboard (for email delivery)

For help: demetri_gregorakis@icloud.com
