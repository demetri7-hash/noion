/**
 * Upsell Opportunity Analysis
 *
 * Analyzes real transaction data to find upsell opportunities:
 * 1. Identify common upsell items (sides, drinks, add-ons)
 * 2. Find orders that DON'T have those items
 * 3. Calculate potential revenue if we upsold to those orders
 * 4. Show real numbers based on actual order data
 */
import mongoose from 'mongoose';
import { Transaction } from '../src/models';

interface UpsellOpportunity {
  itemName: string;
  category: string;
  averagePrice: number;

  // Orders analysis
  totalOrders: number;
  ordersWithItem: number;
  ordersWithoutItem: number;

  // Revenue opportunity
  penetrationRate: number; // % of orders that have this item
  potentialUpsells: number; // # of orders we could upsell
  potentialRevenue: number; // Revenue if we upsold to all missing orders

  // Sample items for reference
  sampleItems: {
    name: string;
    price: number;
  }[];
}

async function analyzeUpsellOpportunities() {
  const restaurantId = process.argv[2] || '68e0bd8a603ef36c8257e021';

  try {
    const dbUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/noion';
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    // Fetch all transactions
    console.log('📥 Fetching transactions...');
    const transactions = await Transaction.find({
      restaurantId: new mongoose.Types.ObjectId(restaurantId)
    }).lean();

    console.log(`Found ${transactions.length} total transactions\n`);

    // Build a catalog of all menu items and their categories
    const itemCatalog = new Map<string, { prices: number[], category: string, count: number }>();
    const modifierCatalog = new Map<string, { prices: number[], count: number }>();
    const actualCategories = new Set<string>();

    transactions.forEach((tx: any) => {
      tx.items?.forEach((item: any) => {
        const itemKey = item.name || 'Unknown Item';
        const category = item.category || 'General';
        actualCategories.add(category);

        if (!itemCatalog.has(itemKey)) {
          itemCatalog.set(itemKey, {
            prices: [],
            category,
            count: 0
          });
        }

        const catalogItem = itemCatalog.get(itemKey)!;
        catalogItem.prices.push(item.unitPrice || 0);
        catalogItem.count++;

        // Track modifiers (these are often upsells)
        item.modifiers?.forEach((mod: any) => {
          const modKey = mod.name || 'Unknown Modifier';
          if (!modifierCatalog.has(modKey)) {
            modifierCatalog.set(modKey, { prices: [], count: 0 });
          }
          const catalogMod = modifierCatalog.get(modKey)!;
          catalogMod.prices.push(mod.price || 0);
          catalogMod.count++;
        });
      });
    });

    // Show actual categories found
    console.log('📁 Categories found in data:');
    Array.from(actualCategories).sort().forEach(cat => {
      const itemsInCat = Array.from(itemCatalog.values()).filter(item => item.category === cat).length;
      console.log(`   - ${cat}: ${itemsInCat} unique items`);
    });
    console.log('');

    // Show top items by frequency
    console.log('🔝 TOP 20 MENU ITEMS BY FREQUENCY:\n');
    const topItems = Array.from(itemCatalog.entries())
      .map(([name, data]) => ({
        name,
        category: data.category,
        avgPrice: data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length,
        count: data.count,
        totalRevenue: data.prices.reduce((sum, p) => sum + p, 0)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    topItems.forEach((item, idx) => {
      const penetrationRate = (item.count / transactions.length) * 100;
      console.log(`${idx + 1}. ${item.name}`);
      console.log(`   Category: ${item.category} | Price: $${item.avgPrice.toFixed(2)} | ${item.count} orders (${penetrationRate.toFixed(1)}%)`);
    });
    console.log('');

    // Identify high-frequency upsell categories (use actual categories found)
    const categories = Array.from(actualCategories);

    console.log('🔍 UPSELL OPPORTUNITY ANALYSIS\n');
    console.log('═'.repeat(80));

    const opportunities: UpsellOpportunity[] = [];

    // Analyze each category
    for (const category of categories) {
      // Find items in this category
      const categoryItems = Array.from(itemCatalog.entries())
        .filter(([_, data]) => data.category.toLowerCase().includes(category.toLowerCase()))
        .map(([name, data]) => ({
          name,
          avgPrice: data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length,
          count: data.count
        }))
        .sort((a, b) => b.count - a.count);

      if (categoryItems.length === 0) continue;

      // Calculate how many orders have items from this category
      let ordersWithCategory = 0;
      transactions.forEach((tx: any) => {
        const hasCategory = tx.items?.some((item: any) =>
          item.category?.toLowerCase().includes(category.toLowerCase())
        );
        if (hasCategory) ordersWithCategory++;
      });

      const ordersWithoutCategory = transactions.length - ordersWithCategory;
      const penetrationRate = (ordersWithCategory / transactions.length) * 100;

      // Calculate average price for this category
      const avgCategoryPrice = categoryItems.reduce((sum, item) => sum + item.avgPrice, 0) / categoryItems.length;

      // Potential revenue if we upsold to 50% of orders without this category
      const conservativeUpsellRate = 0.5; // Assume 50% success rate
      const potentialUpsells = Math.floor(ordersWithoutCategory * conservativeUpsellRate);
      const potentialRevenue = potentialUpsells * avgCategoryPrice;

      opportunities.push({
        itemName: `${category} (various)`,
        category,
        averagePrice: avgCategoryPrice,
        totalOrders: transactions.length,
        ordersWithItem: ordersWithCategory,
        ordersWithoutItem: ordersWithoutCategory,
        penetrationRate,
        potentialUpsells,
        potentialRevenue,
        sampleItems: categoryItems.slice(0, 5)
      });
    }

    // Analyze by item name patterns (since categories are generic)
    const patterns = {
      'Drinks/Beverages': /(drink|soda|juice|water|lemonade|tea|coffee|smoothie|shake|beverage|coke|pepsi|sprite)/i,
      'Sides': /(side|fries|chips|salad|rice|beans|coleslaw|potato|vegg)/i,
      'Desserts': /(dessert|cake|pie|ice cream|cookie|brownie|sweet)/i,
      'Extras/Add-ons': /(add|extra|bacon|cheese|avocado|guac)/i
    };

    for (const [patternName, regex] of Object.entries(patterns)) {
      const matchingItems = Array.from(itemCatalog.entries())
        .filter(([name, _]) => regex.test(name))
        .map(([name, data]) => ({
          name,
          avgPrice: data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length,
          count: data.count
        }));

      if (matchingItems.length === 0) continue;

      // Count orders with items matching this pattern
      let ordersWithPattern = 0;
      transactions.forEach((tx: any) => {
        const hasPattern = tx.items?.some((item: any) => regex.test(item.name || ''));
        if (hasPattern) ordersWithPattern++;
      });

      const ordersWithoutPattern = transactions.length - ordersWithPattern;
      const penetrationRate = (ordersWithPattern / transactions.length) * 100;
      const avgPrice = matchingItems.reduce((sum, item) => sum + item.avgPrice, 0) / matchingItems.length;

      const conservativeUpsellRate = 0.3; // 30% success rate
      const potentialUpsells = Math.floor(ordersWithoutPattern * conservativeUpsellRate);
      const potentialRevenue = potentialUpsells * avgPrice;

      opportunities.push({
        itemName: patternName,
        category: patternName,
        averagePrice: avgPrice,
        totalOrders: transactions.length,
        ordersWithItem: ordersWithPattern,
        ordersWithoutItem: ordersWithoutPattern,
        penetrationRate,
        potentialUpsells,
        potentialRevenue,
        sampleItems: matchingItems.slice(0, 5)
      });
    }

    // Also analyze popular modifiers (add-ons)
    console.log('\n📊 TOP UPSELL OPPORTUNITIES:\n');

    opportunities
      .filter(opp => opp.ordersWithoutItem > 100) // Only show significant opportunities
      .sort((a, b) => b.potentialRevenue - a.potentialRevenue)
      .forEach((opp, idx) => {
        console.log(`${idx + 1}. ${opp.category.toUpperCase()}`);
        console.log(`   Current penetration: ${opp.penetrationRate.toFixed(1)}% (${opp.ordersWithItem.toLocaleString()} orders)`);
        console.log(`   Orders WITHOUT this item type: ${opp.ordersWithoutItem.toLocaleString()}`);
        console.log(`   Average price: $${opp.averagePrice.toFixed(2)}`);
        console.log(`   \n   💰 REVENUE OPPORTUNITY (30% upsell success rate):`);
        console.log(`      If we successfully upsold to 30% of orders without these items:`);
        console.log(`      → ${opp.potentialUpsells.toLocaleString()} additional upsells`);
        console.log(`      → $${opp.potentialRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} potential revenue`);

        if (opp.sampleItems.length > 0) {
          console.log(`   \n   📋 Items in this category:`);
          opp.sampleItems.forEach(item => {
            console.log(`      • ${item.name}: $${item.avgPrice.toFixed(2)} (${item.count} orders)`);
          });
        }
        console.log('');
      });

    // Analyze most common modifiers (these are proven upsells)
    console.log('\n🎯 TOP PROVEN UPSELLS (Modifiers/Add-ons):\n');

    const topModifiers = Array.from(modifierCatalog.entries())
      .map(([name, data]) => ({
        name,
        avgPrice: data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length,
        timesOrdered: data.count,
        totalRevenue: data.prices.reduce((sum, p) => sum + p, 0)
      }))
      .filter(mod => mod.avgPrice > 0 && mod.timesOrdered > 5) // Filter out free items and rare items
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    topModifiers.forEach((mod, idx) => {
      const ordersWithModifier = mod.timesOrdered;
      const ordersWithoutModifier = transactions.length - ordersWithModifier;
      const penetrationRate = (ordersWithModifier / transactions.length) * 100;

      // Potential if we increased penetration by 25% (conservative)
      const targetPenetration = penetrationRate + 25;
      const targetOrders = Math.floor(transactions.length * (targetPenetration / 100));
      const additionalUpsells = targetOrders - ordersWithModifier;
      const potentialRevenue = additionalUpsells * mod.avgPrice;

      console.log(`${idx + 1}. ${mod.name}`);
      console.log(`   Current: ${mod.timesOrdered} orders (${penetrationRate.toFixed(1)}% penetration)`);
      console.log(`   Average price: $${mod.avgPrice.toFixed(2)}`);
      console.log(`   Current revenue: $${mod.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      console.log(`   \n   💰 OPPORTUNITY (+25% penetration):`);
      console.log(`      Additional upsells: ${additionalUpsells.toLocaleString()} orders`);
      console.log(`      Potential revenue: $${potentialRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      console.log('');
    });

    // Summary
    const totalOpportunity = opportunities.reduce((sum, opp) => sum + opp.potentialRevenue, 0);
    const modifierOpportunity = topModifiers.reduce((sum, mod) => {
      const ordersWithModifier = mod.timesOrdered;
      const targetPenetration = ((ordersWithModifier / transactions.length) * 100) + 25;
      const targetOrders = Math.floor(transactions.length * (targetPenetration / 100));
      const additionalUpsells = targetOrders - ordersWithModifier;
      return sum + (additionalUpsells * mod.avgPrice);
    }, 0);

    console.log('\n═'.repeat(80));
    console.log('\n💵 TOTAL REVENUE OPPORTUNITY SUMMARY:\n');
    console.log(`   Item category upsells (30% success): $${totalOpportunity.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   Modifier/add-on upsells (+25% penetration): $${modifierOpportunity.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`   \n   🎯 TOTAL POTENTIAL REVENUE: $${(totalOpportunity + modifierOpportunity).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log('');
    console.log(`   📊 Analysis based on ${transactions.length.toLocaleString()} historical orders`);
    console.log(`   💡 These are conservative estimates - actual results may vary`);
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

analyzeUpsellOpportunities();
