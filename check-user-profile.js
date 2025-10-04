require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const dbUrl = process.env.DATABASE_URL || process.env.MONGODB_URI;

mongoose.connect(dbUrl)
  .then(async () => {
    const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({}, { strict: false }));

    const restaurants = await Restaurant.find({});

    console.log('\n🏪 ALL RESTAURANTS IN DATABASE:\n');
    restaurants.forEach((r, idx) => {
      console.log(`${idx + 1}. Restaurant: ${r.name}`);
      console.log(`   ID: ${r._id}`);
      console.log(`   Owner Email: ${r.owner?.email || 'N/A'}`);
      console.log(`   Owner Name: ${r.owner?.firstName} ${r.owner?.lastName}`);
      console.log(`   POS Type: ${r.posConfig?.type || 'None'}`);
      console.log(`   POS Connected: ${r.posConfig?.isConnected || false}`);
      console.log(`   Toast Location GUID: ${r.posConfig?.locationId || 'Not set'}`);
      console.log(`   Toast Client ID: ${r.posConfig?.clientId ? 'Encrypted ✅' : 'Not set'}`);
      console.log(`   Created: ${r.createdAt}`);
      console.log('');
    });

    // Check which one has actual Toast credentials
    const restaurantWithToast = restaurants.find(r => r.posConfig?.locationId);
    if (restaurantWithToast) {
      console.log('\n✅ RESTAURANT WITH REAL TOAST POS:\n');
      console.log(`   Name: ${restaurantWithToast.name}`);
      console.log(`   ID: ${restaurantWithToast._id}`);
      console.log(`   Owner: ${restaurantWithToast.owner?.email}`);
      console.log(`   GUID: ${restaurantWithToast.posConfig.locationId}`);
      console.log('\n   When you log in as this user, the dashboard will use:');
      console.log(`   - Restaurant ID: ${restaurantWithToast._id}`);
      console.log(`   - Toast GUID: ${restaurantWithToast.posConfig.locationId}`);
      console.log(`   - API will pull YOUR real transactions from Toast POS\n`);
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
