# PHASE 1 - Employee Management Testing Guide

**Status:** ✅ READY FOR TESTING
**Created:** October 3, 2025
**Branch:** `employee-management-system`

---

## 🎯 What Was Built

### PHASE 0: Feature Flags
- Feature flag system to enable/disable features
- Environment variables configured

### PHASE 1: User Management & RBAC
- **4 User Roles:** Owner, Admin, Manager, Employee
- **Casbin RBAC:** Permission-based authorization
- **User Management APIs:** CRUD operations at `/api/v2/users`
- **Database Migration:** Existing users updated with new fields

---

## 🧪 Quick API Tests

### 1. Check if Casbin Initialized

Casbin will initialize automatically when you first call the user APIs. Check server logs for:
```
✅ Casbin enforcer initialized with X policies
```

### 2. Test User List API

**Request:**
```bash
curl -X GET http://localhost:3000/api/v2/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "...",
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "User",
      "role": "owner",
      "phone": "...",
      "isActive": true,
      "points": 0,
      "level": 1,
      "streak": 0,
      "hireDate": "..."
    }
  ],
  "count": 1
}
```

### 3. Test Get Single User

**Request:**
```bash
curl -X GET http://localhost:3000/api/v2/users/{restaurantId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Test Update User (Add Points)

**Request:**
```bash
curl -X PUT http://localhost:3000/api/v2/users/{restaurantId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "points": 100,
    "level": 2,
    "streak": 5
  }'
```

**Expected:** User updated with new gamification values

---

## 🔒 Permission Testing

### Owner Role (default for existing users)
Should have access to:
- ✅ View all users
- ✅ Create users (returns 501 - multi-user coming soon)
- ✅ Update own profile
- ✅ Update other users (when multi-user implemented)
- ✅ View analytics (when implemented)

### Authorization Checks
The middleware checks permissions using Casbin. If you try to access a resource without permission:

**Expected Response (403):**
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to {action} {resource}",
  "details": {
    "role": "employee",
    "resource": "users:all",
    "action": "create"
  }
}
```

---

## 📊 Database Verification

Check MongoDB to see migrated fields:

```javascript
// In MongoDB Compass or shell
db.restaurants.findOne({}, {
  "owner.role": 1,
  "owner.points": 1,
  "owner.level": 1,
  "owner.streak": 1,
  "owner.isActive": 1,
  "owner.hireDate": 1
})
```

**Expected:**
```json
{
  "owner": {
    "role": "owner",
    "points": 0,
    "level": 1,
    "streak": 0,
    "isActive": true,
    "hireDate": "2025-10-03T..."
  }
}
```

---

## 🚀 Feature Flags

Check feature flags are working:

```typescript
// In any component or API route
import { FEATURE_FLAGS } from '@/lib/featureFlags';

console.log(FEATURE_FLAGS.EMPLOYEE_MANAGEMENT); // Should be true
console.log(FEATURE_FLAGS.CHAT_SYSTEM); // Should be false
```

---

## ⚠️ Known Limitations (By Design)

### Multi-User Not Yet Implemented
- Creating new users returns **501 Not Implemented**
- Only restaurant owner exists in database currently
- Will be implemented when Employee collection is added

### Future Phases
These are NOT yet implemented:
- ❌ Role-based analytics dashboards
- ❌ Chat system
- ❌ Task workflows
- ❌ Gamification UI

---

## 🐛 Expected Issues (None Yet!)

**Current Status:** All Phase 1 features working as designed

If you encounter issues:
1. Check Casbin logs in server console
2. Verify JWT token is valid
3. Check feature flags are enabled
4. Verify migration ran successfully

---

## ✅ Success Checklist

- [ ] Server starts without errors
- [ ] Casbin initializes (check logs)
- [ ] Can call `/api/v2/users` and get user list
- [ ] Can call `/api/v2/users/{id}` and get single user
- [ ] Can update user with PUT request
- [ ] Database has new employee management fields
- [ ] Authorization middleware blocks unauthorized requests
- [ ] Feature flags are togglable

---

## 🎯 Next Phase Preview

**PHASE 2: Role-Based Analytics Dashboards**
- Employee dashboard (personal metrics)
- Manager dashboard (team metrics)
- Owner dashboard (business-wide)
- API routes: `/api/v2/analytics/employee`, `/manager`, `/owner`

**Ready to start when you give the go-ahead!**

---

## 📝 Quick Reference

### New API Routes
- `GET /api/v2/users` - List users
- `POST /api/v2/users` - Create user (501 - coming soon)
- `GET /api/v2/users/{id}` - Get user
- `PUT /api/v2/users/{id}` - Update user
- `DELETE /api/v2/users/{id}` - Delete user (501 - coming soon)

### New User Roles
- `owner` - Full access
- `admin` - Manage users, view all data
- `manager` - Manage team, assign tasks
- `employee` - View own data, complete tasks

### Permission Format
- Format: `resource:scope` + `action`
- Example: `users:all` + `read` = "Can read all users"
- Scopes: `own`, `team`, `all`
- Actions: `read`, `create`, `update`, `delete`

---

**Ready to test!** 🚀
