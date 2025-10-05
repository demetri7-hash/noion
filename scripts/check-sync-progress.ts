import mongoose from 'mongoose';

async function checkProgress() {
  await mongoose.connect(process.env.DATABASE_URL!);
  const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({}, { strict: false }));
  const r = await Restaurant.findById('68e0bd8a603ef36c8257e021').select('posConfig.syncProgress name');
  console.log(JSON.stringify(r?.posConfig?.syncProgress, null, 2));
  await mongoose.disconnect();
}

checkProgress();
