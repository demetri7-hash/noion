# Next Session - To-Do List

**Date Created:** 2025-10-04
**Status:** Ready for next development session

---

## 🎉 What We Accomplished Today

### ✅ Fixed Toast POS Connection Issues
1. **Casbin Authorization**
   - Fixed 403 Forbidden errors on POS endpoints
   - Added direct permissions for `restaurant_owner` legacy role
   - Implemented StringAdapter for serverless Casbin initialization
   - Authorization now working: ✅ `restaurant_owner can create on pos:manage`

2. **MongoDB Connection**
   - Fixed buffering timeout errors in serverless environment
   - Added `connectDB()` calls to Toast POS endpoints
   - Connection pooling working properly

3. **Restaurant ID Storage**
   - Fixed "No restaurant ID found" dashboard warning
   - Now storing `restaurantId` in localStorage during:
     - Signup
     - Login
     - Profile fetch
   - Toast POS credentials persisted in database (encrypted)

### ✅ Signup Flow Improvements
1. **Complete Signup Form**
   - Added all required fields (phone, address, restaurant type)
   - Added subscription tier selection (Pulse, Intelligence, Command)
   - Auto-redirect to POS connection after signup
   - Real name and restaurant name displaying correctly

2. **User Profile Display**
   - Created `/api/auth/me` endpoint for full user profile
   - MainLayout shows real firstName + lastName (not email prefix)
   - Sidebar shows real restaurant name (not "My Restaurant")
   - Role badges displaying correctly

---

## 🚨 CRITICAL ISSUES TO FIX NEXT SESSION

### 1. Home Page / Dashboard Loading Issues
**Current Status:** Dashboard showing "still loading"

**To Investigate:**
- [ ] How long does data loading actually take?
- [x] Check if correlation discovery programs are running - **FOUND ISSUE!**
- [ ] Verify all analytics jobs are executing properly
- [ ] Check Redis queue status
- [ ] Review worker logs for errors

**Location:** `/src/components/dashboard/AnalyticsDashboard.tsx`

### 1.5. **CRITICAL: Correlation Engine Not Using Real Data** 🚨
**Current Status:** Correlation discovery runs but finds 0 correlations

**Root Cause Identified:**
- **Weather correlations:** Using random/simulated data instead of real OpenWeatherMap API calls
  - Code says "Note: In production, fetch actual weather data"
  - Currently generates random temps: `baseTemp + (Math.random() * 20 - 10)`
  - OpenWeather API key is configured ✅ but not being used ❌

- **Event correlations:** Returns empty array - not implemented yet
  - Function just returns `[]` with TODO comment

- **Holiday correlations:** Partially implemented, needs testing

**Transaction Data Status:**
- ✅ 5,851 transactions available (way more than 30 minimum)
- ✅ Correlation discovery cron job runs successfully
- ❌ No correlations found because using fake data

**To Fix:**
- [ ] Update `/src/services/CorrelationEngine.ts` line 146-206
- [ ] Replace simulated weather with real `weatherService.getHistoricalWeather()` calls
- [ ] Implement actual event fetching in `analyzeEventCorrelations()`
- [ ] Test holiday correlation analysis
- [ ] Consider caching weather data to avoid rate limits

**Expected Outcome:**
Once fixed, should discover correlations like:
- "Rain decreases foot traffic by 25%"
- "Temperatures above 80°F increase beverage sales by 35%"
- "Holiday weekends show 45% revenue increase"
- "Local events within 1 mile increase traffic by 20%"

**Files to Edit:**
- `/src/services/CorrelationEngine.ts` (lines 146-240)
- `/src/services/ExternalDataService.ts` (already has weather API ready)

### 2. Business Analytics Authorization Errors
**Current Status:** Owner getting "not authorized" when accessing business analytics

**To Fix:**
- [ ] Check Casbin policies for `analytics:all` permissions
- [ ] Verify route protection in `/src/app/dashboard/owner/page.tsx`
- [ ] Test authorization for all role types (owner, admin, manager, employee)
- [ ] Review middleware in business analytics endpoints

**Related Files:**
- `/src/lib/casbin/policies.ts`
- `/src/app/api/v2/analytics/owner/route.ts`
- `/src/middleware/authorize.ts`

### 3. Tasks & Workflows - Not Implemented Yet
**Current Status:** Owner seeing "not authorized" or "nothing assigned"

**To Build:**
- [ ] Task creation UI and API
- [ ] Workflow creation UI and API
- [ ] Task assignment system
- [ ] Task completion tracking
- [ ] Workflow templates
- [ ] Task notifications

**Existing Backend (needs testing):**
- ✅ Models: `/src/models/Task.ts`, `/src/models/Workflow.ts`
- ✅ API routes: `/src/app/api/v2/tasks/`, `/src/app/api/v2/workflows/`
- ❌ Frontend UI: Not built yet
- ❌ Integration with dashboard: Not connected

**Related Files:**
- `/src/app/tasks/page.tsx` - Needs implementation
- `/src/app/api/v2/tasks/route.ts` - Backend exists
- `/src/app/api/v2/workflows/route.ts` - Backend exists

---

## 📋 FEATURES TO BUILD

### 1. Role-Based Home Page (PRIORITY)
**Goal:** Different homepage for each role showing relevant daily info

#### Owner Home Page - "Daily War Room"
Should display:
- [ ] **Sales for the Day**
  - Real-time revenue
  - Transaction count
  - Average ticket size
  - Comparison to yesterday/last week

- [ ] **Staff Performance Today**
  - Top performers
  - Employee stats (hours worked, sales generated)
  - Active employees count

- [ ] **AI Recommendations for Today**
  - Staffing suggestions
  - Inventory alerts
  - Peak hour predictions
  - Action items

- [ ] **Quick Stats**
  - Customer count
  - Busiest hour so far
  - Trending menu items

- [ ] **Alerts & Notifications**
  - Low inventory warnings
  - Staff issues
  - System alerts

#### Manager Home Page
Should display:
- [ ] Team performance
- [ ] Tasks assigned to team
- [ ] Schedule overview
- [ ] Team leaderboard

#### Employee Home Page
Should display:
- [ ] Personal performance stats
- [ ] Assigned tasks
- [ ] Personal leaderboard rank
- [ ] Gamification stats (points, badges, level)

**Implementation:**
- Create: `/src/app/dashboard/page.tsx` (role-based routing)
- Create: `/src/components/dashboard/OwnerDashboard.tsx`
- Create: `/src/components/dashboard/ManagerDashboard.tsx`
- Create: `/src/components/dashboard/EmployeeDashboard.tsx`

### 2. Tasks & Workflows System

#### Task Management
- [ ] Create task form (modal/page)
- [ ] Assign tasks to users
- [ ] Task status tracking (pending, in_progress, completed)
- [ ] Task priority levels
- [ ] Task due dates
- [ ] Task categories

#### Workflow System
- [ ] Workflow templates (opening checklist, closing checklist, etc.)
- [ ] Workflow builder UI
- [ ] Workflow assignment
- [ ] Workflow progress tracking
- [ ] Recurring workflows

#### Integration
- [ ] Connect to dashboard
- [ ] Real-time notifications
- [ ] Mobile-friendly task view

### 3. Analytics Improvements

#### Verify Current Systems Are Running
- [ ] Check correlation discovery cron job: `/src/app/api/cron/discover-correlations/route.ts`
- [ ] Verify Redis queue worker
- [ ] Check Toast sync jobs
- [ ] Review generated insights

#### Add Missing Analytics
- [ ] Staff performance analytics
- [ ] Menu item performance
- [ ] Customer segmentation
- [ ] Peak hour analysis (verify working)

---

## 🔍 VERIFICATION CHECKLIST

### Before Next Session Starts:
1. [ ] Check if Toast POS sync completed successfully
2. [ ] Verify correlations are being discovered
3. [ ] Check worker logs: `/tmp/noion-dev.log`
4. [ ] Test all role-based permissions
5. [ ] Review database for synced transactions

### During Next Session:
1. [ ] Test complete user flow: signup → POS connect → view dashboard
2. [ ] Verify all role types can access appropriate pages
3. [ ] Check analytics are loading with real data
4. [ ] Test task creation (if implemented)

---

## 📂 KEY FILE LOCATIONS

### Current Working Features
- **Auth System:** `/src/app/api/auth/`
- **POS Connection:** `/src/app/api/pos/toast/`
- **Casbin Policies:** `/src/lib/casbin/policies.ts`
- **Main Layout:** `/src/components/layout/MainLayout.tsx`
- **Signup/Login:** `/src/app/signup/page.tsx`, `/src/app/login/page.tsx`

### Needs Implementation
- **Dashboard Home:** `/src/app/dashboard/page.tsx` (currently uses AnalyticsDashboard)
- **Tasks UI:** `/src/app/tasks/page.tsx`
- **Workflows UI:** `/src/app/workflows/page.tsx` (doesn't exist yet)
- **Owner Analytics:** `/src/app/dashboard/owner/page.tsx` (authorization issues)

### Backend Ready (Just Needs Frontend)
- **Tasks API:** `/src/app/api/v2/tasks/route.ts` ✅
- **Workflows API:** `/src/app/api/v2/workflows/route.ts` ✅
- **Analytics APIs:** `/src/app/api/v2/analytics/` ✅

---

## 🎯 RECOMMENDED PRIORITY ORDER

### Session 1 (Next Time):
1. **Fix authorization issues** - Business analytics not accessible
2. **Check analytics loading** - Verify correlation discovery is working
3. **Build role-based home pages** - Owner "war room" dashboard
4. **Test existing tasks/workflows APIs** - See what's already working

### Session 2:
1. **Build task creation UI**
2. **Build workflow builder**
3. **Connect tasks to dashboard**
4. **Add real-time notifications**

### Session 3:
1. **Manager dashboard**
2. **Employee dashboard**
3. **Leaderboard improvements**
4. **Gamification features**

---

## 💡 NOTES & IDEAS

- User is **thrilled** with progress! 🎉
- Toast POS credentials are now properly encrypted and saved
- All authorization issues should be resolved
- Focus on making the home page a true "command center" for owners
- Each role should have a unique, valuable experience
- Tasks and workflows are critical for team management

---

## 🐛 KNOWN BUGS

1. **Dashboard Loading:** "Still loading" - need to investigate
2. **Business Analytics:** Authorization errors for owner role
3. **Tasks Page:** Shows "not authorized" or "nothing assigned"
4. **Home Page:** Currently generic - needs role-based customization

---

**Ready to continue building! The foundation is solid - now let's make it shine! ✨**
