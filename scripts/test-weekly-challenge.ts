/**
 * Test weekly challenge generation
 */
import mongoose from 'mongoose';
import { generateWeeklyChallenge, formatChallengeForTeam } from '../src/lib/analytics/weeklyChallengeGenerator';

async function testWeeklyChallenge() {
  const restaurantId = process.argv[2] || '68e0bd8a603ef36c8257e021';

  try {
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    console.log('🎯 Generating weekly challenge...\n');
    const challenge = await generateWeeklyChallenge(restaurantId);

    console.log('✅ Challenge generated!\n');
    console.log('═'.repeat(80));
    console.log(formatChallengeForTeam(challenge));
    console.log('═'.repeat(80));

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testWeeklyChallenge();
