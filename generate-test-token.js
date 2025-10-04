require('dotenv').config({ path: '.env.local' });
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error('No JWT_SECRET found in environment');
  process.exit(1);
}

// Generate token for test restaurant owner
const token = jwt.sign(
  {
    userId: 'test@example.com',
    restaurantId: '68dec8baa7518fdbcf72a0b0',
    role: 'restaurant_owner',
    email: 'test@example.com'
  },
  secret,
  { expiresIn: '1h' }
);

console.log('\n🔑 Test JWT Token:\n');
console.log(token);
console.log('\n📋 Use in curl commands like:');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/v2/tasks\n`);
