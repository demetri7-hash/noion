require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const dbUrl = process.env.DATABASE_URL || process.env.MONGODB_URI;

if (!dbUrl) {
  console.error('No DATABASE_URL or MONGODB_URI found in environment');
  process.exit(1);
}

mongoose.connect(dbUrl)
  .then(async () => {
    const Correlation = mongoose.model('Correlation', new mongoose.Schema({}, { strict: false }));
    const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));

    const correlations = await Correlation.find().sort({ createdAt: -1 }).limit(5);
    const transactionCount = await Transaction.countDocuments();

    console.log('\n📊 DATABASE STATUS:\n');
    console.log(`Transactions: ${transactionCount}`);
    console.log(`Correlations: ${correlations.length}`);
    console.log('');

    if (correlations.length === 0) {
      console.log('⚠️  No correlations found! Discovery may not have run yet.\n');
    } else {
      console.log('🎯 DISCOVERED CORRELATIONS:\n');
      correlations.forEach((c, idx) => {
        console.log(`${idx + 1}. ${c.type}`);
        console.log(`   Pattern: ${c.pattern.description}`);
        console.log(`   When: ${c.pattern.whenCondition}`);
        console.log(`   Then: ${c.pattern.thenOutcome}`);
        console.log(`   Strength: ${c.pattern.strength}`);
        if (c.pattern.recommendation) {
          console.log(`   💡 Recommendation: ${c.pattern.recommendation}`);
        }
        console.log(`   Correlation: ${c.statistics.correlation.toFixed(2)}`);
        console.log(`   Confidence: ${c.statistics.confidence.toFixed(1)}%`);
        console.log(`   Created: ${c.createdAt}`);
        console.log('');
      });
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
