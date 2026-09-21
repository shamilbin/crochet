import '../api/_lib/loadEnv.js';
import { connectDB } from '../api/_lib/db.js';
import Category from '../api/_lib/models/Category.js';
import Product from '../api/_lib/models/Product.js';

const categories = [
  { name: 'Flowers', slug: 'flowers' },
  { name: 'Bags', slug: 'bags' },
  { name: 'Keychains', slug: 'keychains' },
  { name: 'Bouquets', slug: 'bouquets' },
];

async function replaceGiftsWithFlowers() {
  const gifts = await Category.findOne({ slug: 'gifts' });
  if (!gifts) return;

  const flowers = await Category.findOne({ slug: 'flowers' });
  if (flowers) {
    await Product.updateMany({ category: gifts._id }, { category: flowers._id });
    await gifts.deleteOne();
    return;
  }

  // Keep the same category ID so products already assigned to Gifts stay linked.
  gifts.name = 'Flowers';
  gifts.slug = 'flowers';
  await gifts.save();
}

async function run() {
  await connectDB();
  await replaceGiftsWithFlowers();
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
