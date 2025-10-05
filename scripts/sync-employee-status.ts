/**
 * Sync employee active status from Toast using correct deleted/disabled fields
 */
import mongoose from 'mongoose';
import Restaurant from '../src/models/Restaurant';
import { decryptToastCredentials } from '../src/utils/toastEncryption';
import axios from 'axios';

async function syncEmployeeStatus() {
  const restaurantId = process.argv[2] || '68e0bd8a603ef36c8257e021';

  try {
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      console.error(`❌ Restaurant not found: ${restaurantId}`);
      process.exit(1);
    }

    // Decrypt Toast credentials
    console.log('🔓 Decrypting Toast credentials...');
    const credentials = decryptToastCredentials({
      clientId: restaurant.posConfig?.clientId,
      encryptedClientSecret: restaurant.posConfig?.encryptedClientSecret,
      locationId: restaurant.posConfig?.locationId
    });

    // Authenticate with Toast
    console.log('🔑 Authenticating with Toast...');
    const authResponse = await axios.post(
      'https://ws-api.toasttab.com/authentication/v1/authentication/login',
      {
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      }
    );

    const accessToken = authResponse.data.token?.accessToken || authResponse.data.access_token;

    // Fetch employees from Toast
    console.log('📥 Fetching employees from Toast...\n');
    const employeesResponse = await axios.get(
      `https://ws-api.toasttab.com/labor/v1/employees?restaurantGuid=${credentials.locationGuid}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Toast-Restaurant-External-ID': credentials.locationGuid
        }
      }
    );

    const toastEmployees = employeesResponse.data;
    console.log(`Found ${toastEmployees.length} employees in Toast\n`);

    // Build a map of Toast employee ID -> active status
    const toastStatusMap = new Map();
    let activeCount = 0;
    let inactiveCount = 0;

    toastEmployees.forEach((emp: any) => {
      // Per Toast API: active = NOT deleted AND NOT disabled
      const isActive = !emp.deleted && !emp.disabled;
      toastStatusMap.set(emp.guid, isActive);

      if (isActive) {
        activeCount++;
      } else {
        inactiveCount++;
      }
    });

    console.log(`📊 Toast Status Summary:`);
    console.log(`   Active: ${activeCount}`);
    console.log(`   Inactive (deleted or disabled): ${inactiveCount}\n`);

    // Update our employees
    let updatedCount = 0;
    let unchangedCount = 0;
    let notFoundCount = 0;

    if (restaurant.team?.employees) {
      console.log('🔄 Updating employee statuses...\n');

      for (const employee of restaurant.team.employees) {
        if (!employee.toastEmployeeId) {
          notFoundCount++;
          continue;
        }

        const toastStatus = toastStatusMap.get(employee.toastEmployeeId);

        if (toastStatus === undefined) {
          console.log(`⚠️  Not found in Toast: ${employee.firstName} ${employee.lastName} (${employee.toastEmployeeId})`);
          notFoundCount++;
          continue;
        }

        if (employee.isActive !== toastStatus) {
          const oldStatus = employee.isActive ? 'ACTIVE' : 'INACTIVE';
          const newStatus = toastStatus ? 'ACTIVE' : 'INACTIVE';
          console.log(`   ${employee.firstName} ${employee.lastName}: ${oldStatus} → ${newStatus}`);
          employee.isActive = toastStatus;
          updatedCount++;
        } else {
          unchangedCount++;
        }
      }

      await restaurant.save();

      console.log(`\n✅ Sync Complete!`);
      console.log(`   Total employees in DB: ${restaurant.team.employees.length}`);
      console.log(`   Updated: ${updatedCount}`);
      console.log(`   Unchanged: ${unchangedCount}`);
      console.log(`   Not found in Toast: ${notFoundCount}`);

      const finalActive = restaurant.team.employees.filter(e => e.isActive).length;
      console.log(`\n📊 Final Count:`);
      console.log(`   Active: ${finalActive}`);
      console.log(`   Inactive: ${restaurant.team.employees.length - finalActive}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message || error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

syncEmployeeStatus();
