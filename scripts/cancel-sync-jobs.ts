/**
 * Cancel all pending/processing sync jobs
 */
import mongoose from 'mongoose';
import SyncJob from '../src/models/SyncJob';

async function cancelJobs() {
  const restaurantId = process.argv[2] || '68e0bd8a603ef36c8257e021';

  try {
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    // Find all pending/processing jobs
    const jobs = await SyncJob.find({
      restaurantId,
      status: { $in: ['pending', 'processing'] }
    });

    console.log(`Found ${jobs.length} active sync jobs to cancel\n`);

    for (const job of jobs) {
      console.log(`Cancelling job: ${job.jobId}`);
      job.status = 'failed';
      job.error = {
        message: 'Cancelled manually - worker needs to be updated with encryption fix',
        code: 'MANUAL_CANCEL',
        timestamp: new Date()
      };
      job.completedAt = new Date();
      await job.save();
      console.log(`  ✅ Cancelled`);
    }

    console.log('\n✅ All active sync jobs cancelled');
    console.log('Now redeploy Railway worker with the fix, then reconnect Toast.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

cancelJobs();
