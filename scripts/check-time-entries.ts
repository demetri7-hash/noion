import mongoose from 'mongoose';

async function checkTimeEntries() {
  await mongoose.connect(process.env.DATABASE_URL!);

  const TimeEntry = mongoose.model('TimeEntry', new mongoose.Schema({}, { strict: false }));
  const Shift = mongoose.model('Shift', new mongoose.Schema({}, { strict: false }));

  const restaurantId = '68e0bd8a603ef36c8257e021';

  const timeEntryCount = await TimeEntry.countDocuments({ restaurantId });
  const shiftCount = await Shift.countDocuments({ restaurantId });

  console.log('📊 Labor Data Check:');
  console.log(`  Time Entries: ${timeEntryCount}`);
  console.log(`  Shifts: ${shiftCount}`);

  // Get sample time entry
  const sampleTimeEntry = await TimeEntry.findOne({ restaurantId }).lean();
  if (sampleTimeEntry) {
    console.log('\n📝 Sample Time Entry:', JSON.stringify(sampleTimeEntry, null, 2).substring(0, 500));
  }

  // Get sample shift
  const sampleShift = await Shift.findOne({ restaurantId }).lean();
  if (sampleShift) {
    console.log('\n📅 Sample Shift:', JSON.stringify(sampleShift, null, 2).substring(0, 500));
  }

  await mongoose.disconnect();
}

checkTimeEntries();
