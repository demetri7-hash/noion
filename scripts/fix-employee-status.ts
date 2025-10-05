/**
 * Fix employee active status from Toast POS
 */
import mongoose from 'mongoose';
import { Restaurant } from '../src/models';
import { decryptToastCredentials } from '../src/utils/toastEncryption';

async function fixEmployeeStatus() {
  const restaurantId = process.argv[2] || '68e0bd8a603ef36c8257e021';

  try {
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      console.log('❌ Restaurant not found');
      return;
    }

    console.log('Restaurant:', restaurant.name);

    // Check Toast credentials
    if (!restaurant.posConfig?.clientId || !restaurant.posConfig?.encryptedClientSecret || !restaurant.posConfig?.locationId) {
      console.log('❌ Missing Toast credentials');
      return;
    }

    // Decrypt credentials
    const credentials = decryptToastCredentials({
      clientId: restaurant.posConfig.clientId,
      encryptedClientSecret: restaurant.posConfig.encryptedClientSecret,
      locationId: restaurant.posConfig.locationId
    });

    // Authenticate with Toast
    console.log('🔐 Authenticating with Toast...');
    const tokenResponse = await fetch('https://ws-api.toasttab.com/authentication/v1/authentication/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      })
    });

    if (!tokenResponse.ok) {
      console.log('❌ Toast authentication failed');
      return;
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.token?.accessToken || tokenData.access_token;

    // Fetch employees from Toast
    console.log('📥 Fetching employees from Toast...');
    const employeesResponse = await fetch(
      `https://ws-api.toasttab.com/labor/v1/employees?restaurantGuid=${credentials.locationGuid}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Toast-Restaurant-External-ID': credentials.locationGuid
        }
      }
    );

    if (!employeesResponse.ok) {
      console.log('❌ Failed to fetch employees from Toast');
      return;
    }

    const toastEmployees = await employeesResponse.json();
    console.log(`Found ${toastEmployees.length} employees in Toast\n`);

    // Build status map
    const toastStatusMap = new Map<string, boolean>();
    toastEmployees.forEach((emp: any) => {
      const isActive = !emp.deleted && !emp.disabled;
      toastStatusMap.set(emp.guid, isActive);
    });

    const activeCount = Array.from(toastStatusMap.values()).filter(v => v).length;
    console.log(`Active in Toast: ${activeCount}`);
    console.log(`Inactive in Toast: ${toastEmployees.length - activeCount}\n`);

    // Update our employees
    let updated = 0;
    let unchanged = 0;

    if (restaurant.team?.employees) {
      restaurant.team.employees.forEach((emp: any) => {
        if (emp.toastEmployeeId && toastStatusMap.has(emp.toastEmployeeId)) {
          const toastStatus = toastStatusMap.get(emp.toastEmployeeId);
          if (emp.isActive !== toastStatus) {
            console.log(`Updating ${emp.firstName} ${emp.lastName}: ${emp.isActive} → ${toastStatus}`);
            emp.isActive = toastStatus;
            updated++;
          } else {
            unchanged++;
          }
        }
      });
    }

    if (updated > 0) {
      await restaurant.save();
      console.log(`\n✅ Updated ${updated} employee statuses`);
    } else {
      console.log(`\n✅ All ${unchanged} employees already have correct status`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixEmployeeStatus();
