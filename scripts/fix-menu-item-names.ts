/**
 * Fix menu item names in existing transactions
 * Extracts real item names from rawPOSData that's already stored
 */
import mongoose from 'mongoose';
import { Transaction } from '../src/models';

async function fixMenuItemNames() {
  const restaurantId = process.argv[2] || '68e0bd8a603ef36c8257e021';

  try {
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    // Fetch all transactions with generic "MenuItem" names
    console.log('📥 Fetching transactions with generic item names...');
    const transactions = await Transaction.find({
      restaurantId,
      'items.name': 'MenuItem'
    });

    console.log(`Found ${transactions.length} transactions to fix\n`);

    if (transactions.length === 0) {
      console.log('✅ No transactions need fixing!');
      return;
    }

    let fixed = 0;
    let errors = 0;

    console.log('🔧 Fixing menu item names...\n');

    for (const tx of transactions) {
      try {
        const rawData = (tx as any).integration?.rawPOSData;

        if (!rawData || !rawData.checks?.[0]?.selections) {
          console.log(`⚠️  Transaction ${tx.posTransactionId}: No raw data available`);
          errors++;
          continue;
        }

        const selections = rawData.checks[0].selections;
        let itemsUpdated = false;

        // Update each item with real data from rawPOSData
        (tx as any).items = (tx as any).items.map((item: any, idx: number) => {
          const selection = selections[idx];
          if (!selection) return item;

          const updated = {
            ...item,
            name: selection.displayName || item.name,
            category: selection.salesCategory?.name || item.category
          };

          // Update modifiers too
          if (selection.modifiers) {
            updated.modifiers = item.modifiers.map((mod: any, modIdx: number) => {
              const rawMod = selection.modifiers[modIdx];
              if (!rawMod) return mod;

              return {
                ...mod,
                name: rawMod.displayName || mod.name,
                price: rawMod.price || mod.price
              };
            });
          }

          itemsUpdated = true;
          return updated;
        });

        if (itemsUpdated) {
          await tx.save();
          fixed++;

          if (fixed % 100 === 0) {
            console.log(`   Progress: ${fixed}/${transactions.length} transactions fixed`);
          }
        }

      } catch (error: any) {
        console.error(`❌ Error fixing transaction ${tx.posTransactionId}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Fix Complete!`);
    console.log(`   Fixed: ${fixed} transactions`);
    console.log(`   Errors: ${errors}`);
    console.log(`\n💡 Menu item names are now real! Run the upsell analysis to see results.\n`);

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

fixMenuItemNames();
