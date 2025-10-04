/**
 * Initialize Test Data
 * Run with: node scripts/init-test-data.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

async function main() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(DATABASE_URL);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get test user (use any existing user)
    const restaurant = await db.collection('restaurants').findOne({});
    if (!restaurant) {
      console.log('❌ No restaurants found. Please sign up first.');
      process.exit(1);
    }

    console.log(`✅ Found test user: ${restaurant.owner.email}`);
    console.log(`   Restaurant ID: ${restaurant._id}`);

    // 1. Initialize Badges
    console.log('\n📛 Initializing badges...');
    const existingBadges = await db.collection('badges').countDocuments({ isActive: true });

    if (existingBadges > 0) {
      console.log(`   Already have ${existingBadges} badges. Skipping badge creation.`);
    } else {
      const defaultBadges = [
        // Performance Badges
        { name: 'First Task', description: 'Complete your first task', icon: '🎯', category: 'performance', criteria: { type: 'tasks_completed', value: 1 }, pointsBonus: 50, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { name: 'Task Master', description: 'Complete 50 tasks', icon: '🏆', category: 'performance', criteria: { type: 'tasks_completed', value: 50 }, pointsBonus: 500, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { name: 'Centurion', description: 'Complete 100 tasks', icon: '💯', category: 'performance', criteria: { type: 'tasks_completed', value: 100 }, pointsBonus: 1000, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { name: 'Picture Perfect', description: 'Upload 25 task photos', icon: '📸', category: 'performance', criteria: { type: 'photos_uploaded', value: 25 }, pointsBonus: 250, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { name: 'Sign Master', description: 'Complete 25 digital signatures', icon: '✍️', category: 'performance', criteria: { type: 'signatures_completed', value: 25 }, pointsBonus: 250, isActive: true, createdAt: new Date(), updatedAt: new Date() },

        // Consistency Badges
        { name: 'Hot Streak', description: 'Maintain a 7-day streak', icon: '🔥', category: 'consistency', criteria: { type: 'streak_days', value: 7 }, pointsBonus: 350, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { name: 'Unstoppable', description: 'Maintain a 14-day streak', icon: '⚡', category: 'consistency', criteria: { type: 'streak_days', value: 14 }, pointsBonus: 700, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { name: 'Legendary', description: 'Maintain a 30-day streak', icon: '👑', category: 'consistency', criteria: { type: 'streak_days', value: 30 }, pointsBonus: 1500, isActive: true, createdAt: new Date(), updatedAt: new Date() },

        // Milestone Badges
        { name: 'Rising Star', description: 'Earn 1,000 points', icon: '⭐', category: 'milestone', criteria: { type: 'total_points', value: 1000 }, pointsBonus: 100, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { name: 'VIP', description: 'Earn 5,000 points', icon: '💎', category: 'milestone', criteria: { type: 'total_points', value: 5000 }, pointsBonus: 500, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { name: 'Legend', description: 'Earn 10,000 points', icon: '🏅', category: 'milestone', criteria: { type: 'total_points', value: 10000 }, pointsBonus: 1000, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ];

      await db.collection('badges').insertMany(defaultBadges);
      console.log(`✅ Created ${defaultBadges.length} default badges`);
    }

    // 2. Create Sample Workflow Templates
    console.log('\n📋 Creating sample workflow templates...');
    const existingTemplates = await db.collection('workflowtemplates').countDocuments({ restaurantId: restaurant._id });

    if (existingTemplates > 0) {
      console.log(`   Already have ${existingTemplates} templates. Skipping template creation.`);
    } else {
      const templates = [
        {
          restaurantId: restaurant._id,
          name: 'Opening Checklist',
          description: 'Daily opening tasks for the restaurant',
          tasks: [
            { order: 1, title: 'Check refrigerator temperatures', description: 'Verify all fridges are at correct temp', requiresPhoto: true, requiresSignature: false, requiresNotes: true },
            { order: 2, title: 'Inspect dining area', description: 'Check tables, chairs, and cleanliness', requiresPhoto: true, requiresSignature: false, requiresNotes: false },
            { order: 3, title: 'Verify POS system', description: 'Ensure POS is working correctly', requiresPhoto: false, requiresSignature: true, requiresNotes: true },
            { order: 4, title: 'Stock check', description: 'Verify inventory levels', requiresPhoto: true, requiresSignature: false, requiresNotes: true },
          ],
          recurrence: { type: 'daily', time: '08:00' },
          assignmentType: 'role',
          assignedRole: 'manager',
          isActive: true,
          createdBy: restaurant.owner.email,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          restaurantId: restaurant._id,
          name: 'Closing Checklist',
          description: 'End of day closing procedures',
          tasks: [
            { order: 1, title: 'Clean kitchen equipment', description: 'Deep clean all cooking equipment', requiresPhoto: true, requiresSignature: false, requiresNotes: false },
            { order: 2, title: 'Empty trash and recycling', description: 'Take out all trash', requiresPhoto: false, requiresSignature: false, requiresNotes: false },
            { order: 3, title: 'Count cash register', description: 'Complete end-of-day cash count', requiresPhoto: false, requiresSignature: true, requiresNotes: true },
            { order: 4, title: 'Lock all doors', description: 'Ensure all exits are secured', requiresPhoto: false, requiresSignature: true, requiresNotes: false },
          ],
          recurrence: { type: 'daily', time: '22:00' },
          assignmentType: 'role',
          assignedRole: 'manager',
          isActive: true,
          createdBy: restaurant.owner.email,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          restaurantId: restaurant._id,
          name: 'Weekly Inventory',
          description: 'Weekly inventory count and ordering',
          tasks: [
            { order: 1, title: 'Count all inventory', description: 'Full inventory count', requiresPhoto: false, requiresSignature: false, requiresNotes: true },
            { order: 2, title: 'Check expiration dates', description: 'Remove expired items', requiresPhoto: true, requiresSignature: false, requiresNotes: true },
            { order: 3, title: 'Place supply orders', description: 'Order needed supplies', requiresPhoto: false, requiresSignature: true, requiresNotes: true },
          ],
          recurrence: { type: 'weekly', dayOfWeek: 1, time: '10:00' },
          assignmentType: 'role',
          assignedRole: 'manager',
          isActive: true,
          createdBy: restaurant.owner.email,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.collection('workflowtemplates').insertMany(templates);
      console.log(`✅ Created ${templates.length} workflow templates`);
    }

    console.log('\n✅ Test data initialization complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Badges: ${await db.collection('badges').countDocuments({ isActive: true })}`);
    console.log(`   - Workflow Templates: ${await db.collection('workflowtemplates').countDocuments({ restaurantId: restaurant._id })}`);
    console.log('\n🎉 You can now test the application with sample data!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

main();
