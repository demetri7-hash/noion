const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function main() {
  await mongoose.connect(process.env.DATABASE_URL);
  const db = mongoose.connection.db;

  const user = await db.collection('restaurants').findOne({ 'owner.email': 'test@example.com' });

  if (user) {
    console.log('✅ User found!');
    console.log('Email:', user.owner.email);
    console.log('Has password hash:', !!user.owner.password);
    console.log('Restaurant ID:', user._id);
  } else {
    console.log('❌ User not found');
  }

  await mongoose.disconnect();
}

main();
