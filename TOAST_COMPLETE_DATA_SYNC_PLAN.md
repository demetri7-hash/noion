# Toast POS Complete Data Sync Plan

**Goal:** Sync ALL available historical data from Toast POS for comprehensive analytics

**Date:** October 5, 2025

---

## Part 1: Available Toast API Endpoints

### 📦 **TRANSACTION DATA**
| Endpoint | Description | Historical? | Currently Syncing? | Priority |
|----------|-------------|-------------|-------------------|----------|
| `/orders/v2/ordersBulk` | Order transactions, items, payments | ✅ Yes (30-day chunks) | ✅ **YES** | **CRITICAL** |
| `/orders/v2/{orderGuid}` | Individual order details | ✅ Yes | ⚠️ Partial | Medium |

### 👥 **EMPLOYEE DATA**
| Endpoint | Description | Historical? | Currently Syncing? | Priority |
|----------|-------------|-------------|-------------------|----------|
| `/labor/v1/employees` | Employee roster, roles, status | ✅ Yes | ✅ **YES** | **HIGH** |
| `/labor/v1/timeEntries` | Clock-in/out, shifts, hours worked | ✅ Yes | ❌ **NO** | **CRITICAL** |
| `/labor/v1/jobs` | Job positions/roles available | ✅ Yes | ❌ **NO** | **HIGH** |
| `/labor/v1/shifts` | Scheduled shifts | ✅ Yes | ❌ **NO** | **HIGH** |

### 🍔 **MENU DATA**
| Endpoint | Description | Historical? | Currently Syncing? | Priority |
|----------|-------------|-------------|-------------------|----------|
| `/menus/v2/menus` | Current menu structure | ⚠️ Current only | ❌ **NO** | **HIGH** |
| `/menus/v2/items` | Menu items, prices, modifiers | ⚠️ Current only | ❌ **NO** | **HIGH** |
| `/menus/v2/groups` | Menu categories/groups | ⚠️ Current only | ❌ **NO** | Medium |

### ⚙️ **CONFIGURATION DATA**
| Endpoint | Description | Historical? | Currently Syncing? | Priority |
|----------|-------------|-------------|-------------------|----------|
| `/config/v2/tipWithholding` | Tip reporting configuration | Current only | ❌ **NO** | Medium |
| `/config/v2/breakTypes` | Break types available | Current only | ❌ **NO** | Medium |
| `/config/v2/cashDrawers` | Cash drawer configuration | Current only | ❌ **NO** | Low |
| `/config/v2/diningOptions` | Dine-in, takeout, delivery options | Current only | ❌ **NO** | Low |

### 📊 **SALES & REPORTING DATA**
| Endpoint | Description | Historical? | Currently Syncing? | Priority |
|----------|-------------|-------------|-------------------|----------|
| `/stock/v1/items` | Inventory items | Current only | ❌ **NO** | Medium |
| `/stock/v1/counts` | Inventory counts | ✅ Historical | ❌ **NO** | Low |

### 🏪 **RESTAURANT INFO**
| Endpoint | Description | Historical? | Currently Syncing? | Priority |
|----------|-------------|-------------|-------------------|----------|
| `/restaurants/v1/restaurants/{guid}` | Restaurant details, settings | Current only | ⚠️ Partial | Low |
| `/restaurants/v1/terminals` | POS terminals | Current only | ❌ **NO** | Low |

---

## Part 2: What We're Currently Syncing

### ✅ **CURRENTLY IMPLEMENTED**

1. **Orders/Transactions** (`/orders/v2/ordersBulk`)
   - Order GUIDs
   - Business dates
   - Transaction totals
   - Payment methods
   - Items ordered (with quantities, prices, modifiers)
   - Customer info (if available)
   - Dining option (dine-in, takeout, delivery)
   - Server/employee who handled order

2. **Employees** (`/labor/v1/employees`)
   - Employee GUIDs
   - Names
   - Roles
   - Active/inactive status
   - Toast-specific data

3. **Restaurant Configuration**
   - Basic restaurant info
   - Location
   - POS credentials

### ❌ **MISSING CRITICAL DATA**

1. **Employee Time Tracking** - No clock-in/out data
2. **Labor Hours** - No shift data or hours worked
3. **Menu & Pricing** - No current menu structure or historical pricing
4. **Job Positions** - No job/role definitions
5. **Inventory** - No stock tracking
6. **Tips** - No tip reporting data

---

## Part 3: Implementation Priority

### **PHASE 1: CRITICAL LABOR DATA** (Implement First)

**Why Critical:** Labor is the #2 expense after cost of goods. Without labor data, we can't:
- Calculate labor cost percentage
- Track employee productivity
- Optimize scheduling
- Identify wage theft or time fraud
- Forecast staffing needs

**Endpoints to Add:**

1. **Time Entries** (`/labor/v1/timeEntries`)
   ```
   GET /labor/v1/timeEntries?modifiedStartDate=X&modifiedEndDate=Y
   ```
   **Returns:**
   - Clock-in timestamp
   - Clock-out timestamp
   - Regular hours
   - Overtime hours
   - Hourly wage
   - Employee GUID
   - Job GUID
   - Break durations
   - Tips earned during shift

   **Historical:** ✅ Yes (30-day chunks like orders)

2. **Jobs** (`/labor/v1/jobs`)
   ```
   GET /labor/v1/jobs
   ```
   **Returns:**
   - Job GUID
   - Job title (Server, Cook, Manager, etc.)
   - Default wage
   - Tip eligible flag

   **Historical:** Current snapshot only

3. **Shifts** (`/labor/v1/shifts`)
   ```
   GET /labor/v1/shifts?businessDate=YYYY-MM-DD
   ```
   **Returns:**
   - Scheduled shifts
   - Shift start/end times
   - Employee assigned
   - Job position

   **Historical:** ✅ Yes (by business date)

**Database Schema:**

```typescript
// New Model: TimeEntry
interface ITimeEntry {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  toastTimeEntryGuid: string;
  employeeId: Types.ObjectId; // Link to Employee
  employeeToastGuid: string;
  jobId?: Types.ObjectId; // Link to Job
  jobToastGuid?: string;

  clockInTime: Date;
  clockOutTime?: Date; // Null if still clocked in
  breakDuration: number; // Minutes

  regularHours: number;
  overtimeHours: number;
  doubleOvertimeHours?: number;

  hourlyWage: number;
  tipsEarned?: number;

  businessDate: Date;
  createdDate: Date;
  modifiedDate: Date;

  // Calculated
  totalHours: number;
  totalPay: number;
}

// New Model: Job
interface IJob {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  toastJobGuid: string;

  title: string; // "Server", "Cook", "Manager"
  description?: string;
  defaultWage: number;
  tipEligible: boolean;

  isActive: boolean;
  createdDate: Date;
  modifiedDate: Date;
}

// New Model: Shift (scheduled shifts)
interface IShift {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  toastShiftGuid: string;

  employeeId: Types.ObjectId;
  employeeToastGuid: string;
  jobId: Types.ObjectId;

  scheduledStart: Date;
  scheduledEnd: Date;
  businessDate: Date;

  actualTimeEntryId?: Types.ObjectId; // Link to actual TimeEntry if worked

  createdDate: Date;
  modifiedDate: Date;
}
```

---

### **PHASE 2: MENU & PRICING DATA** (Implement Second)

**Why Important:** Menu data enables:
- Price change tracking
- Menu optimization (which items are profitable)
- Upsell opportunity detection
- Seasonal menu analysis
- Modifier attachment rate analysis

**Endpoints to Add:**

1. **Menus** (`/menus/v2/menus`)
   ```
   GET /menus/v2/menus
   ```
   **Returns:**
   - Menu GUID
   - Menu name (Lunch, Dinner, Brunch)
   - Active periods
   - Menu groups (categories)

2. **Menu Items** (`/menus/v2/items`)
   ```
   GET /menus/v2/items
   ```
   **Returns:**
   - Item GUID
   - Item name
   - Price
   - Description
   - Category
   - Modifiers available
   - Nutritional info
   - SKU
   - Tax rate

**Database Schema:**

```typescript
// New Model: Menu
interface IMenu {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  toastMenuGuid: string;

  name: string; // "Lunch", "Dinner", "Happy Hour"
  description?: string;

  groups: IMenuGroup[]; // Categories

  isActive: boolean;
  lastSyncedAt: Date;
}

interface IMenuGroup {
  toastGroupGuid: string;
  name: string; // "Appetizers", "Entrees"
  items: string[]; // Array of item GUIDs
}

// New Model: MenuItem
interface IMenuItem {
  _id: Types.ObjectId;
  restaurantId: Types.ObjectId;
  toastItemGuid: string;

  name: string;
  description?: string;
  sku?: string;

  price: number;
  taxRate?: number;

  category: string;
  isActive: boolean;

  modifiers?: IModifier[];

  // Historical price tracking
  priceHistory: Array<{
    price: number;
    effectiveDate: Date;
  }>;

  lastSyncedAt: Date;
}

interface IModifier {
  toastModifierGuid: string;
  name: string; // "Add Cheese", "Extra Sauce"
  price: number;
  default: boolean;
}
```

---

### **PHASE 3: CONFIGURATION & METADATA** (Implement Third)

**Endpoints to Add:**

1. **Tip Withholding** (`/config/v2/tipWithholding`)
2. **Break Types** (`/config/v2/breakTypes`)
3. **Dining Options** (`/config/v2/diningOptions`)
4. **Cash Drawers** (`/config/v2/cashDrawers`)

---

## Part 4: Historical Sync Strategy

### **Sync Order & Approach**

```
INITIAL SYNC (Run Once):
├── 1. Find First Order Date (Binary Search)
│   └── Query backwards from today to Dec 1, 2015
│
├── 2. Sync Configuration Data (Current Snapshot)
│   ├── Jobs (/labor/v1/jobs)
│   ├── Menus (/menus/v2/menus)
│   ├── Menu Items (/menus/v2/items)
│   ├── Break Types (/config/v2/breakTypes)
│   └── Tip Withholding (/config/v2/tipWithholding)
│
├── 3. Sync Employees (Current Snapshot)
│   └── /labor/v1/employees
│
├── 4. Sync Historical Data (30-day chunks from firstOrderDate to today)
│   ├── Orders (/orders/v2/ordersBulk)
│   ├── Time Entries (/labor/v1/timeEntries)
│   └── Shifts (/labor/v1/shifts)
│
└── 5. Mark Initial Sync Complete
    └── Set flag: posConfig.initialSyncComplete = true
```

### **Incremental Sync (Daily)**

```
INCREMENTAL SYNC:
├── 1. Check Last Sync Date
│
├── 2. Sync Configuration Updates (If changed)
│   └── Compare lastModifiedDate, only fetch if newer
│
├── 3. Sync Employee Updates
│   └── Fetch only modified employees
│
└── 4. Sync New Transactional Data (Since Last Sync)
    ├── Orders (last 7 days for safety)
    ├── Time Entries (last 7 days)
    └── Shifts (last 7 days)
```

---

## Part 5: Toast API Rate Limits

**Official Limits:**
- **5 requests per second per location** per endpoint
- **Throttling:** 429 response if exceeded

**Our Strategy:**
- Space requests 1-2 seconds apart during historical sync
- Parallel processing for different endpoints (not same endpoint)
- Exponential backoff on 429 errors

---

## Part 6: Implementation Timeline

### **Week 1: Phase 1 - Labor Data**

**Day 1-2:** Database Schema
- Create TimeEntry, Job, Shift models
- Add indexes
- Migration scripts

**Day 3-4:** API Integration
- Add `/labor/v1/timeEntries` to ToastIntegration service
- Add `/labor/v1/jobs` endpoint
- Add `/labor/v1/shifts` endpoint
- Test with sample data

**Day 5:** Historical Sync
- Update SmartToastSync to include labor endpoints
- Test full historical sync
- Validate data integrity

### **Week 2: Phase 2 - Menu Data**

**Day 1-2:** Database Schema
- Create Menu, MenuItem models
- Price history tracking structure

**Day 3-4:** API Integration
- Add `/menus/v2/menus` endpoint
- Add `/menus/v2/items` endpoint
- Build menu change detection

**Day 5:** Testing & Validation
- Sync menu data
- Build menu analytics queries

### **Week 3: Phase 3 - Config & Polish**

**Day 1-2:** Configuration Endpoints
- Add remaining config endpoints
- Store configuration snapshots

**Day 3-5:** Testing & Optimization
- End-to-end testing
- Performance optimization
- Documentation

---

## Part 7: Analytics Unlocked by Complete Data

### **With Labor Data:**

1. **Labor Cost Percentage**
   ```
   Labor Cost % = (Total Labor Cost / Total Revenue) * 100
   ```

2. **Sales per Labor Hour**
   ```
   SPLH = Total Sales / Total Labor Hours
   ```

3. **Employee Productivity**
   - Average ticket per server
   - Items sold per hour
   - Tips earned per hour

4. **Schedule Optimization**
   - Overstaffed vs understaffed hours
   - Scheduled vs actual hours (no-shows)
   - Optimal staffing levels by day/hour

### **With Menu Data:**

1. **Menu Item Performance**
   - Revenue by item
   - Profit margin by item
   - Sales velocity (items/hour)

2. **Price Optimization**
   - Price elasticity (did sales drop after price increase?)
   - Optimal pricing by day/time

3. **Upsell Analytics**
   - Modifier attach rates
   - Item combo frequency
   - Cross-sell opportunities

### **With Combined Data:**

1. **Server Performance by Item**
   - Which servers sell which items best
   - Upsell champions

2. **Labor Efficiency by Menu Mix**
   - Kitchen labor hours vs complexity of orders
   - Prep time by menu item

3. **Predictive Scheduling**
   - Forecast labor needs based on predicted revenue
   - Optimal staffing by menu complexity

---

## Part 8: Storage Impact

### **Current Storage:**
- 5,933 orders × 5KB = ~30MB

### **With All Data:**
- Orders: 30MB
- Time Entries: ~10MB (3 years × 30 employees × 365 days × 300 bytes)
- Jobs: <1MB (static)
- Shifts: ~5MB
- Menus: <1MB (current snapshot)
- Menu Items: ~2MB (with price history)

**Total: ~50MB per restaurant**

**At Scale:**
- 100 restaurants: 5GB
- 1,000 restaurants: 50GB

---

## Part 9: Smart First Order Finder - Fix Required

**Current Issue:** Binary search not finding orders even though they exist

**Root Cause:** Unknown - need to debug Toast API response

**Fix Strategy:**

1. **Add detailed logging** to see exact API responses
2. **Test with known date range** (Sept 3-5, 2025 where we know orders exist)
3. **Check if using correct parameters** (startDate, endDate, businessDate)
4. **Verify authentication token** is valid throughout search
5. **Add fallback:** If binary search fails, default to last 90 days

**Alternative Approach:**
Instead of binary search, ask user for approximate start date or use restaurant opening date from database.

---

## Part 10: Next Steps

1. ✅ **Document complete** - This file
2. ⏳ **Create database models** for TimeEntry, Job, Shift, Menu, MenuItem
3. ⏳ **Add API methods** to ToastIntegration service
4. ⏳ **Update SmartToastSync** to include all endpoints
5. ⏳ **Fix binary search** or implement fallback
6. ⏳ **Test complete historical sync** with all data

**Estimated Time:**
- Models: 4 hours
- API Integration: 8 hours
- Sync Update: 4 hours
- Testing: 4 hours
**Total: 20 hours (~3 days)**

---

## Appendix: Toast API Documentation Links

- **Orders API:** https://doc.toasttab.com/doc/devguide/portalOrdersApiOverview.html
- **Labor API:** https://doc.toasttab.com/doc/devguide/apiGettingTimeEntriesForEmployees.html
- **Menus API:** https://doc.toasttab.com/doc/devguide/apiGettingMenuInformationFromTheMenusAPI.html
- **Configuration API:** https://doc.toasttab.com/doc/devguide/apiOverview.html
- **Rate Limiting:** https://doc.toasttab.com/doc/devguide/apiRateLimiting.html
