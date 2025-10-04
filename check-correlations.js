const mongoose = require('mongoose');

mongoose.connect(process.env.DATABASE_URL)
  .then(async () => {
    const Correlation = mongoose.model('Correlation', new mongoose.Schema({}, { strict: false }));

    const correlations = await Correlation.find().sort({ createdAt: -1 }).limit(5);

    console.log('\n🎯 DISCOVERED CORRELATIONS:\n');
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
      console.log('');
    });

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
