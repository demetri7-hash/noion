# Next Session: Quick Fix Guide

## PRIORITY 1: Add Analytics Engine to Worker

### File: `src/worker/index.ts`

**Add import at top:**
```typescript
import { InsightGenerator } from '@/services/InsightGenerator';
```

**Add after line 70 (after "Toast sync completed"):**
```typescript
console.log(`✅ Toast sync completed for restaurant ${restaurantId}`);

// Generate insights from imported transactions
console.log('🤖 Generating AI insights...');
const insightGenerator = new InsightGenerator();
await insightGenerator.generateInsightsForRestaurant(restaurantId);
console.log('✅ Insights generated successfully');

// Mark restaurant as connected
restaurant.posConfig.isConnected = true;
```

---

## PRIORITY 2: Fix Progress Tracking

### File: `src/services/ToastIntegration.ts`

Need to find where transactions are imported and add:

```typescript
// Update sync job progress
syncJob.progress.ordersProcessed += importedCount;
await syncJob.save();
```

**Search for:** `Transaction.create` or transaction import loop
**Add:** Progress tracking in that location

---

## Deploy Steps

1. **Edit the files above**
2. **Build worker:**
   ```bash
   npm run build:worker
   ```
3. **Deploy to Railway:**
   ```bash
   railway up
   ```
4. **Test new sync from UI**
5. **Check results:**
   ```bash
   node -e "
   const mongoose = require('mongoose');
   mongoose.connect('mongodb+srv://demetri7_db_user:L9THnfRUfAWnmggK@noion-cluster.wsnmmhg.mongodb.net/noion')
     .then(() => mongoose.connection.db.collection('insights').countDocuments())
     .then(count => console.log('Insights:', count))
     .then(() => process.exit(0));
   "
   ```

---

## Expected Results After Fix

**Railway Logs Should Show:**
```
✅ Toast sync completed for restaurant 68dec8baa7518fdbcf72a0b0
🤖 Generating AI insights...
✅ Insights generated successfully
📧 Sent completion email to: test@example.com
```

**Database Should Have:**
- insights collection: 5-10+ documents
- syncJob.result.ordersImported: 5995 (not 0)

**Dashboard Should Show:**
- Revenue metrics ✅ (already works)
- AI-generated insights/recommendations ✅ (new)

---

## Current State

- ✅ 5,995 transactions imported
- ✅ Worker processes jobs
- ✅ Email sends
- ❌ Analytics never runs (THIS IS THE FIX)
- ❌ Progress shows 0 (secondary fix)
