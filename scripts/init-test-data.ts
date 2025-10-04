/**
 * Initialize Test Data
 * Run with: npx ts-node scripts/init-test-data.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import Badge from '../src/models/Badge.ts';
import WorkflowTemplate from '../src/models/WorkflowTemplate.ts';
import Restaurant from '../src/models/Restaurant.ts';

async function main() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Connected to MongoDB');

    // Get test user
    const testUser = await Restaurant.findOne({ 'owner.email': 'demetri7@gmail.com' });
    if (!testUser) {
      console.log('❌ Test user not found. Please sign up with demetri7@gmail.com first.');
      process.exit(1);
    }

    console.log(`✅ Found test user: ${testUser.owner.email}`);
    console.log(`   Restaurant ID: ${testUser._id}`);

    // 1. Initialize Badges
    console.log('\n📛 Initializing badges...');
    const existingBadges = await Badge.countDocuments({ isActive: true });

    if (existingBadges > 0) {
      console.log(`   Already have ${existingBadges} badges. Skipping badge creation.`);
    } else {
      const defaultBadges = [
        // Performance Badges
        { name: 'First Task', description: 'Complete your first task', icon: '🎯', category: 'performance', criteria: { type: 'tasks_completed', value: 1 }, pointsBonus: 50, isActive: true },
        { name: 'Task Master', description: 'Complete 50 tasks', icon: '🏆', category: 'performance', criteria: { type: 'tasks_completed', value: 50 }, pointsBonus: 500, isActive: true },
        { name: 'Centurion', description: 'Complete 100 tasks', icon: '💯', category: 'performance', criteria: { type: 'tasks_completed', value: 100 }, pointsBonus: 1000, isActive: true },
        { name: 'Picture Perfect', description: 'Upload 25 task photos', icon: '📸', category: 'performance', criteria: { type: 'photos_uploaded', value: 25 }, pointsBonus: 250, isActive: true },
        { name: 'Sign Master', description: 'Complete 25 digital signatures', icon: '✍️', category: 'performance', criteria: { type: 'signatures_completed', value: 25 }, pointsBonus: 250, isActive: true },

        // Consistency Badges
        { name: 'Hot Streak', description: 'Maintain a 7-day streak', icon: '🔥', category: 'consistency', criteria: { type: 'streak_days', value: 7 }, pointsBonus: 350, isActive: true },
        { name: 'Unstoppable', description: 'Maintain a 14-day streak', icon: '⚡', category: 'consistency', criteria: { type: 'streak_days', value: 14 }, pointsBonus: 700, isActive: true },
        { name: 'Legendary', description: 'Maintain a 30-day streak', icon: '👑', category: 'consistency', criteria: { type: 'streak_days', value: 30 }, pointsBonus: 1500, isActive: true },

        // Milestone Badges
        { name: 'Rising Star', description: 'Earn 1,000 points', icon: '⭐', category: 'milestone', criteria: { type: 'total_points', value: 1000 }, pointsBonus: 100, isActive: true },
        { name: 'VIP', description: 'Earn 5,000 points', icon: '💎', category: 'milestone', criteria: { type: 'total_points', value: 5000 }, pointsBonus: 500, isActive: true },
        { name: 'Legend', description: 'Earn 10,000 points', icon: '🏅', category: 'milestone', criteria: { type: 'total_points', value: 10000 }, pointsBonus: 1000, isActive: true },
      ];

      await Badge.insertMany(defaultBadges);
      console.log(`✅ Created ${defaultBadges.length} default badges`);
    }

    // 2. Create Sample Workflow Templates
    console.log('\n📋 Creating sample workflow templates...');
    const existingTemplates = await WorkflowTemplate.countDocuments({ restaurantId: testUser._id });

    if (existingTemplates > 0) {
      console.log(`   Already have ${existingTemplates} templates. Skipping template creation.`);
    } else {
      const templates = [
        {
          restaurantId: testUser._id,
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
          createdBy: testUser.owner.email,
        },
        {
          restaurantId: testUser._id,
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
          createdBy: testUser.owner.email,
        },
        {
          restaurantId: testUser._id,
          name: 'Weekly Inventory',
          description: 'Weekly inventory count and ordering',
          tasks: [
            { order: 1, title: 'Count all inventory', description: 'Full inventory count', requiresPhoto: false, requiresSignature: false, requiresNotes: true },
            { order: 2, title: 'Check expiration dates', description: 'Remove expired items', requiresPhoto: true, requiresSignature: false, requiresNotes: true },
            { order: 3, title: 'Place supply orders', description: 'Order needed supplies', requiresPhoto: false, requiresSignature: true, requiresNotes: true },
          ],
          recurrence: { type: 'weekly', dayOfWeek: 1, time: '10:00' }, // Monday at 10am
          assignmentType: 'role',
          assignedRole: 'manager',
          isActive: true,
          createdBy: testUser.owner.email,
        },
      ];

      await WorkflowTemplate.insertMany(templates);
      console.log(`✅ Created ${templates.length} workflow templates`);
    }

    console.log('\n✅ Test data initialization complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Badges: ${await Badge.countDocuments({ isActive: true })}`);
    console.log(`   - Workflow Templates: ${await WorkflowTemplate.countDocuments({ restaurantId: testUser._id })}`);
    console.log('\n🎉 You can now test the application with sample data!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

main();
