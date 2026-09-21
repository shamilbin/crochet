import './_lib/loadEnv.js';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './_lib/db.js';
import Product from './_lib/models/Product.js';
import Category from './_lib/models/Category.js';
import { signToken, setAuthCookie, clearAuthCookie, requireAuth, getAuthedAdmin } from './_lib/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const admins = JSON.parse(fs.readFileSync(path.join(__dirname, '_lib', 'admins.json'), 'utf-8'));

const app = express();

// Product images are compressed in the browser and sent as data URLs.
// This leaves room below Vercel's request-body limit for product details.
app.use(express.json({ limit: '4mb' }));
app.use(cors({ origin: true, credentials: true }));

// This is intentionally served by the API instead of a VITE_ variable, so a
// WhatsApp number changed in Vercel's environment is used by the live site
// after redeployment. It is public contact information, not a secret.
app.get('/api/config', (req, res) => {
  const whatsappNumber = String(process.env.WHATSAPP_NUMBER || process.env.VITE_WHATSAPP_NUMBER || '')
    .replace(/\D/g, '');
  res.json({ whatsappNumber });
});

/* ---------------------------- AUTH ---------------------------- */

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const admin = admins.find((a) => a.email.toLowerCase() === String(email).toLowerCase());
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

  if (password !== admin.password) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ email: admin.email });
  setAuthCookie(res, token);
  res.json({ ok: true, email: admin.email });
});

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const admin = getAuthedAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ email: admin.email });
});

// Authentication does not depend on the product database. Keeping this after
// the auth routes lets an admin sign in and see a clear database error rather
// than rejecting valid credentials when the database is temporarily offline.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection failed:', err.name, err.message);
    const missingConfig = /MONGODB_URI is not set/.test(err.message);
    const atlasUnavailable = err.name === 'MongooseServerSelectionError';
    res.status(atlasUnavailable ? 503 : 500).json({
      error: missingConfig
        ? 'Database is not configured. Add MONGODB_URI to use persistent product storage.'
        : atlasUnavailable
          ? 'MongoDB Atlas cannot be reached. In Atlas, add this device or server IP address under Network Access, then try again.'
        : 'Database connection failed',
    });
  }
});

/* -------------------------- CATEGORIES ------------------------- */

app.get('/api/categories', async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json(categories);
});

app.post('/api/categories', requireAuth, async (req, res) => {
  try {
    const name = typeof req.body?.name === 'string'
      ? req.body.name.trim().replace(/\s+/g, ' ')
      : '';
    if (!name) return res.status(400).json({ error: 'Enter a category name.' });
    if (name.length > 60) return res.status(400).json({ error: 'Category names can be at most 60 characters.' });

    // Generate this on the server instead of trusting a browser-provided slug.
    // Unicode letters and numbers are deliberately preserved for non-English names.
    const slug = name
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/(^-|-$)/g, '');
    if (!slug) return res.status(400).json({ error: 'Use at least one letter or number in the category name.' });

    const category = await Category.create({ name, slug });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Category already exists' });
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    console.error('Failed to create category:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.delete('/api/categories/:id', requireAuth, async (req, res) => {
  const inUse = await Product.exists({ category: req.params.id });
  if (inUse) return res.status(400).json({ error: 'Category has products. Move or delete them first.' });
  await Category.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

/* --------------------------- PRODUCTS --------------------------- */

app.get('/api/products', async (req, res) => {
  const { category, search, sort, inStock } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (inStock === 'true') filter.inStock = true;
  if (search) filter.name = { $regex: search, $options: 'i' };

  let sortSpec = { createdAt: -1 }; // newest first, default
  if (sort === 'price-asc') sortSpec = { price: 1 };
  else if (sort === 'price-desc') sortSpec = { price: -1 };
  else if (sort === 'discount-desc') sortSpec = { discountPercentage: -1 };

  const products = await Product.find(filter).sort(sortSpec).populate('category', 'name slug');
  res.json(products);
});

app.get('/api/products/:id', async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.post('/api/products', requireAuth, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/products/:id', requireAuth, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default app;

if (!process.env.VERCEL) {
  // Port 5000 is reserved by macOS Control Center/AirPlay on some machines.
  // Keep this in sync with Vite's local /api proxy (vite.config.js).
  const port = Number(process.env.PORT) || 5001;
  app.listen(port, async () => {
    try {
      await connectDB();
      const count = await Category.countDocuments();
      if (count === 0) {
        const starters = [
          { name: 'Flowers', slug: 'flowers' },
          { name: 'Bags', slug: 'bags' },
          { name: 'Keychains', slug: 'keychains' },
          { name: 'Bouquets', slug: 'bouquets' },
        ];
        await Category.insertMany(starters);
        console.log('Seeded starter categories:', starters.map((c) => c.name).join(', '));
      }
    } catch (err) {
      console.error('Failed to start database:', err);
    }
    console.log(`API running on http://localhost:${port}`);
  });
}
