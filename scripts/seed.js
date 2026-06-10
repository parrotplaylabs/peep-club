import { config } from '../src/config.js';
import { buildSeedData } from '../src/lib/seedData.js';
import { store } from '../src/store/dataStore.js';

async function main() {
  const seedData = buildSeedData();
  await store.replaceAll(seedData);
  console.log('Seed complete.');
  console.log(`  Data: ${config.dataPath}`);
  console.log(`  Members: ${seedData.members.length}`);
  console.log(`  Events: ${seedData.events.length}`);
  console.log(`  Attendance: ${seedData.attendance.length}`);
  console.log(`  Announcements: ${seedData.announcements.length}`);
  if (config.operatorPin) {
    console.log('  Operator PIN is set in .env');
  } else {
    console.log('  No OPERATOR_PIN set — open access (set in .env to require PIN)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
