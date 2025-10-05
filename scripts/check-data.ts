import mongoose from 'mongoose';

async function checkData() {
  await mongoose.connect(process.env.DATABASE_URL!);
  const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));
  const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({}, { strict: false }));
  
  // Check distinct restaurant IDs
  const restaurantIds = await Transaction.distinct('restaurantId');
  console.log('📊 Restaurant IDs with transactions:', restaurantIds);
  
  // Check our target restaurant
  const targetRestaurant = await Restaurant.findById('68e0bd8a603ef36c8257e021').select('name').lean();
  console.log('🎯 Target restaurant:', targetRestaurant);
  
  // Check transaction counts per restaurant
  for (const rid of restaurantIds) {
    const count = await Transaction.countDocuments({ restaurantId: rid });
    const r = await Restaurant.findById(rid).select('name').lean();
    console.log(`  ${r?.name || 'Unknown'} (${rid}): ${count} transactions`);
  }
  
  await mongoose.disconnect();
}

checkData();
