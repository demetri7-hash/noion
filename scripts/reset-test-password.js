const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function main() {
  await mongoose.connect(process.env.DATABASE_URL);
  const db = mongoose.connection.db;

  const email = 'test@example.com';
  const newPassword = 'TEST1234*';

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update the user
  const result = await db.collection('restaurants').updateOne(
    { 'owner.email': email },
    { $set: { 'owner.password': hashedPassword } }
  );

  if (result.matchedCount > 0) {
    console.log('✅ Password updated successfully!');
    console.log('Email:', email);
    console.log('Password:', newPassword);
  } else {
    console.log('❌ User not found');
  }

  await mongoose.disconnect();
}

main();
