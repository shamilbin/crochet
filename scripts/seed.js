import '../api/_lib/loadEnv.js';
import { connectDB } from '../api/_lib/db.js';
import Category from '../api/_lib/models/Category.js';

const categories = [
  { name: 'Gifts', slug: 'gifts' },
  { name: 'Bags', slug: 'bags' },
  { name: 'Keychains', slug: 'keychains' },
  { name: 'Bouquets', slug: 'bouquets' },
];

async function run() {
  await connectDB();
  for (const c of categories) {
    await Category.updateOne({ slug: c.slug }, c, { upsert: true });
  }
  console.log('Seeded categories:', categories.map((c) => c.name).join(', '));
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
