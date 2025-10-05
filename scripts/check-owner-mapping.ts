/**
 * Check if owner is mapped to a Toast employee GUID
 */
import mongoose from 'mongoose';
import Restaurant from '../src/models/Restaurant';

async function checkOwnerMapping() {
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

    console.log('🔍 Owner Information:');
    console.log(`   Name: ${restaurant.owner?.name || 'Not set'}`);
    console.log(`   Email: ${restaurant.owner?.email || 'Not set'}`);
    console.log(`   Toast Employee ID: ${restaurant.owner?.toastEmployeeId || '❌ NOT MAPPED'}`);
    console.log(`   Points: ${restaurant.owner?.points || 0}`);
    console.log(`   Level: ${restaurant.owner?.level || 1}\n`);

    console.log('📊 Searching for owner in employee list...');
    const ownerAsEmployee = restaurant.team?.employees?.find((emp: any) =>
      emp.email === 'demetri7@gmail.com' ||
      emp.firstName === 'Demetri' ||
      emp.email?.toLowerCase().includes('demetri')
    );

    if (ownerAsEmployee) {
      console.log('   ✅ Found in employees:');
      console.log(`   Name: ${ownerAsEmployee.firstName} ${ownerAsEmployee.lastName}`);
      console.log(`   Email: ${ownerAsEmployee.email || 'No email'}`);
      console.log(`   Toast Employee ID: ${ownerAsEmployee.toastEmployeeId}`);
      console.log(`   Is Active: ${ownerAsEmployee.isActive}`);
      console.log(`   Role: ${ownerAsEmployee.role}`);
      console.log(`   Points: ${ownerAsEmployee.points || 0}`);
      console.log(`   Level: ${ownerAsEmployee.level || 1}\n`);

      console.log('💡 RECOMMENDATION:');
      if (!restaurant.owner?.toastEmployeeId && ownerAsEmployee.toastEmployeeId) {
        console.log('   Owner record should be updated with Toast Employee ID:');
        console.log(`   owner.toastEmployeeId = "${ownerAsEmployee.toastEmployeeId}"`);
      } else {
        console.log('   Owner is properly mapped!');
      }
    } else {
      console.log('   ❌ Owner not found in employee list');
      console.log('\n💡 RECOMMENDATION:');
      console.log('   Owner may need to be imported from Toast as an employee');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

checkOwnerMapping();
