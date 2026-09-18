// Run: node scripts/seed.js
// Requires MONGODB_URI in your environment (e.g. `export MONGODB_URI=...` first,
// or use `npx dotenv-cli -e .env node scripts/seed.js`).
import mongoose from 'mongoose';
import Category from '../api/_lib/models/Category.js';

const categories = [
  { name: 'Gifts', slug: 'gifts' },
  { name: 'Bags', slug: 'bags' },
  { name: 'Keychains', slug: 'keychains' },
  { name: 'Bouquets', slug: 'bouquets' },
];

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('Set MONGODB_URI first.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  for (const c of categories) {
    await Category.updateOne({ slug: c.slug }, c, { upsert: true });
  }
  console.log('Seeded categories:', categories.map((c) => c.name).join(', '));
  await mongoose.disconnect();
}

run();
