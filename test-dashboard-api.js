require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const dbUrl = process.env.DATABASE_URL || process.env.MONGODB_URI;

mongoose.connect(dbUrl)
  .then(async () => {
    const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({}, { strict: false }));

    const restaurant = await Restaurant.findOne({});
    if (restaurant) {
      console.log('\n📍 Restaurant ID:', restaurant._id.toString());
      console.log('   Name:', restaurant.name);
      console.log('   POS Connected:', restaurant.posConfig?.isConnected || false);
      console.log('\nTest the dashboard at:');
      console.log(`http://localhost:3000/api/dashboard/${restaurant._id}?timeRange=30d\n`);
    } else {
      console.log('No restaurant found');
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
