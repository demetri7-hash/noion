/**
 * Migration Script: Add Employee Management Fields to Existing Users
 *
 * This script adds employee management and gamification fields to existing restaurant owners.
 * Safe to run multiple times (idempotent).
 *
 * Run with: npx ts-node -r tsconfig-paths/register scripts/migrate-employee-management.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

/**
 * Migration logic
 */
async function migrateEmployeeManagement() {
  console.log('🚀 Starting Employee Management Migration...\n');

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(DATABASE_URL!);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const restaurantsCollection = db!.collection('restaurants');

    // Find all restaurants without employee management fields
    const restaurantsToMigrate = await restaurantsCollection
      .find({
        $or: [
          { 'owner.role': { $exists: false } },
          { 'owner.points': { $exists: false } },
          { 'owner.level': { $exists: false } },
          { 'owner.streak': { $exists: false } },
          { 'owner.isActive': { $exists: false } },
        ],
      })
      .toArray();

    console.log(`📊 Found ${restaurantsToMigrate.length} restaurants to migrate\n`);

    if (restaurantsToMigrate.length === 0) {
      console.log('✅ All restaurants already have employee management fields. Nothing to migrate.');
      await mongoose.disconnect();
      return;
    }

    // Update each restaurant
    let successCount = 0;
    let errorCount = 0;

    for (const restaurant of restaurantsToMigrate) {
      try {
        const updateFields: any = {};

        // Add role if missing (existing users are owners)
        if (!restaurant.owner.role) {
          updateFields['owner.role'] = 'owner';
        }

        // Add gamification fields if missing
        if (restaurant.owner.points === undefined || restaurant.owner.points === null) {
          updateFields['owner.points'] = 0;
        }
        if (restaurant.owner.level === undefined || restaurant.owner.level === null) {
          updateFields['owner.level'] = 1;
        }
        if (restaurant.owner.streak === undefined || restaurant.owner.streak === null) {
          updateFields['owner.streak'] = 0;
        }

        // Add isActive if missing (default true)
        if (restaurant.owner.isActive === undefined || restaurant.owner.isActive === null) {
          updateFields['owner.isActive'] = true;
        }

        // Add hireDate if missing (use createdAt or current date)
        if (!restaurant.owner.hireDate) {
          updateFields['owner.hireDate'] = restaurant.createdAt || new Date();
        }

        // Perform update
        await restaurantsCollection.updateOne(
          { _id: restaurant._id },
          { $set: updateFields }
        );

        successCount++;
        console.log(`✅ Migrated: ${restaurant.owner.email} (${restaurant.name})`);
      } catch (error) {
        errorCount++;
        console.error(
          `❌ Failed to migrate: ${restaurant.owner.email} (${restaurant.name})`,
          error
        );
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📝 Total: ${restaurantsToMigrate.length}\n`);

    // Verify migration
    console.log('🔍 Verifying migration...');
    const remaining = await restaurantsCollection.countDocuments({
      $or: [
        { 'owner.role': { $exists: false } },
        { 'owner.points': { $exists: false } },
        { 'owner.level': { $exists: false } },
        { 'owner.isActive': { $exists: false } },
      ],
    });

    if (remaining === 0) {
      console.log('✅ Verification passed! All restaurants have employee management fields.\n');
    } else {
      console.log(
        `⚠️  Warning: ${remaining} restaurants still missing fields. Check errors above.\n`
      );
    }

    console.log('🎉 Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run migration
migrateEmployeeManagement()
  .then(() => {
    console.log('\n✅ Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
