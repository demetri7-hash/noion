# Toast Credential Fix - Deployed

**Date:** October 4, 2025
**Issue:** "Missing required encrypted credentials" error when fetching Toast data
**Status:** ✅ Fixed and Deployed

---

## 🔍 Root Cause Analysis

The error occurred because the system was trying to decrypt Toast credentials without checking if all required fields were present in the database:

1. **Required fields for decryption:**
   - `clientId` (encrypted)
   - `encryptedClientSecret` (encrypted)
   - `locationId` (Toast restaurant GUID)

2. **The bug:** Login auto-sync was checking for `clientId` and `encryptedClientSecret` but **NOT** `locationId` before attempting decryption

3. **Result:** If `locationId` was missing, the decryption would fail with a generic "Missing required encrypted credentials" error

---

## ✅ What Was Fixed

### 1. **Enhanced Error Messages** (`src/utils/toastEncryption.ts`)
- Now shows **exactly which fields are missing**
- Shows which fields **are** available
- Example error: `"Missing required encrypted credentials: locationId. Available fields: clientId, encryptedClientSecret"`

### 2. **Login Auto-Sync Check** (`src/app/api/auth/login/route.ts`)
- Added `locationId` validation before attempting decryption
- Added diagnostic logging showing which credentials are present/missing
- Prevents crash when credentials are incomplete

### 3. **Dashboard Diagnostic Logging** (`src/app/api/dashboard/today/[restaurantId]/route.ts`)
- Logs credential status before attempting to fetch Toast data
- Shows field lengths and availability
- Helps diagnose credential issues in production

### 4. **Diagnostic Tool** (`scripts/check-toast-credentials.ts`)
- New CLI tool to inspect Toast credentials in database
- Usage: `npx tsx scripts/check-toast-credentials.ts <restaurantId>`
- Shows:
  - Which credentials are present
  - Encryption format validation
  - GUID format validation

---

## 🚀 Deployment

**Production URL:** https://noion-2uxkivyvh-demetri-gregorakis-projects.vercel.app
**Inspect URL:** https://vercel.com/demetri-gregorakis-projects/noion/7BvLPESUxpBsZ2f5p7oyHNNhdMw8

**Git Commit:** `21d5821`
**Branch:** `main`

---

## 🔧 What To Do Next

### Option 1: Reconnect Toast POS (Recommended)
The safest solution is to reconnect Toast POS with the fixed code:

1. Go to the POS page in your dashboard
2. Disconnect Toast (if connected)
3. Reconnect with your credentials:
   - **Location GUID:** Your Toast restaurant GUID
   - **Client ID:** Your Toast API client ID
   - **Client Secret:** Your Toast API client secret

The new code will properly save all three required fields with better logging.

### Option 2: Check Current Credentials
Use the diagnostic script to see what's currently in the database:

```bash
cd /Users/demetrigregorakis/noion
npx tsx scripts/check-toast-credentials.ts <YOUR_RESTAURANT_ID>
```

This will show:
- Which credentials are present
- Which are missing
- Format validation results

### Option 3: Monitor Logs
With the new logging, you'll see detailed error messages in Vercel logs:
1. Go to Vercel dashboard → Logs
2. Look for login attempts or dashboard loads
3. Check for credential diagnostic messages

---

## 📊 Expected Behavior After Fix

### On Login:
- ✅ Checks all 3 credential fields before auto-sync
- ✅ Logs which fields are missing if incomplete
- ✅ Gracefully skips auto-sync without crashing

### On Dashboard Load:
- ✅ Logs credential status before fetching Toast data
- ✅ Shows detailed error if credentials are incomplete
- ✅ Continues showing other dashboard data

### On Toast Reconnect:
- ✅ Encrypts and saves all 3 required fields
- ✅ Logs successful save with verification
- ✅ Triggers background sync job
- ✅ Sets `isConnected = true` after successful sync

---

## 🐛 Debug Commands

### Check credentials in database:
```bash
npx tsx scripts/check-toast-credentials.ts <restaurantId>
```

### Monitor Vercel logs:
```bash
vercel logs --follow
```

### Trigger manual sync (after reconnecting):
```bash
curl -X POST https://your-domain.vercel.app/api/pos/toast/sync \
  -H "Authorization: Bearer <your-token>"
```

---

## 📝 Technical Details

### Files Changed:
1. `src/utils/toastEncryption.ts` - Enhanced error messages
2. `src/app/api/auth/login/route.ts` - Fixed validation check
3. `src/app/api/dashboard/today/[restaurantId]/route.ts` - Added logging
4. `scripts/check-toast-credentials.ts` - New diagnostic tool

### Key Improvements:
- Better validation before decryption
- Detailed error messages for debugging
- Diagnostic tools for production issues
- Non-breaking error handling

---

## ✅ Next Steps Recommendation

**IMMEDIATE ACTION:** Reconnect Toast POS using the fixed code to ensure all credentials are properly saved.

After reconnecting:
1. The sync job will run automatically
2. Check Vercel logs to confirm successful sync
3. Verify dashboard shows Toast data (hours worked, etc.)
4. Monitor for any remaining errors

---

**Questions or Issues?**
Check Vercel logs or use the diagnostic script to inspect the database state.
