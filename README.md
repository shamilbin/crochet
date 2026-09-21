# Cozy Loopz

A MERN storefront for a handmade crochet shop. Public catalog with categories,
search, and sort; product pages with an image carousel and a "Buy on WhatsApp"
button; a password-protected `/admin/dashboard` for managing products and
categories. Built to deploy as a single Vercel project (React frontend +
Express API as serverless functions) with MongoDB Atlas as the free database.

## Project structure

```
cozy-loopz/
  api/                 Express app, deployed as Vercel serverless functions
    _lib/
      db.js             cached MongoDB connection
      auth.js           JWT + cookie helpers
      admins.json        admin email + password
      models/            Product.js, Category.js
    index.js             all API routes (mounted at /api/*)
  src/                  React app (Vite)
    pages/               Home, Shop, ProductDetail, AdminLogin, AdminDashboard
    components/          Navbar, Footer, ProductCard
  scripts/
    seed.js                   seeds starter categories
  vercel.json            routes /api/* to the Express app
```

## 1. Set up MongoDB Atlas (free)

1. Create a free account at mongodb.com/cloud/atlas and create a free **M0**
   cluster.
2. Create a database user (username + password).
3. Network Access → allow access from anywhere (`0.0.0.0/0`) — needed since
   Vercel's serverless IPs aren't fixed.
4. Get your connection string (Drivers → Node.js), it looks like:
   `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/cozyloopz?retryWrites=true&w=majority`

## 2. Set your admin password

Edit `api/_lib/admins.json` with a plain email and password:

```json
[
  { "email": "shamiltk029@gmail.com", "password": "admin@123" }
]
```

You can add more admins by adding more objects to this array. Restart the
API after changing this file.

## 3. Environment variables

Copy `.env.example` to `.env` for local dev, and set the same variables in
**Vercel → Project Settings → Environment Variables** for production:

| Variable | Where | Notes |
|---|---|---|
| `MONGODB_URI` | Vercel + local | required; from a free MongoDB Atlas cluster |
| `JWT_SECRET` | Vercel + local | any long random string |
| `NODE_ENV` | Vercel | set to `production` |
| `WHATSAPP_NUMBER` | Vercel + local | e.g. `919645213232`; the product page reads this from the API |

## 4. Seed starter categories (optional)

```bash
export MONGODB_URI="your-connection-string"
node scripts/seed.js
```

This adds Flowers, Bags, Keychains, Bouquets. You can also add/remove
categories later from `/admin/dashboard`.

## 5. Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

This starts the Express API on **http://localhost:5001** and the React app on
**http://localhost:5173**. Open the Vite URL printed in the terminal — it
automatically uses the next available port if 5173 is busy. Vite proxies `/api` to
the backend.

`MONGODB_URI` is required. The app intentionally refuses to use a temporary
in-memory database so products and categories cannot appear to save and then
disappear after an API restart. Use a free MongoDB Atlas cluster for durable
storage in local development and Vercel.

Admin login: `/admin/login`

- Email: `shamiltk029@gmail.com`
- Password: `admin@123`

You do **not** need `vercel dev` for local work. Use Vercel only when deploying.

## 6. Deploy to Vercel

1. Push this project to a GitHub repo.
2. In Vercel, "Add New Project" → import the repo.
3. Vercel auto-detects Vite for the frontend and picks up everything in
   `/api` as serverless functions — no extra config needed beyond the env
   vars above.
4. Add the environment variables from step 3, deploy.
5. Your site is live at `your-project.vercel.app`. The admin panel is at
   `your-project.vercel.app/admin/dashboard` (redirects to `/admin/login` if
   not signed in) — it's not linked anywhere in the public site, so regular
   visitors won't stumble onto it.

### Free persistent database

This app already uses MongoDB, so MongoDB Atlas is the simplest free hosted
database—no code migration to Firebase or Supabase is needed. Create an Atlas
**Free** cluster, create a database user, allow network access from Vercel,
and copy its Node.js connection string into `MONGODB_URI` both locally and in
Vercel. Atlas also offers a Vercel integration that can configure
`MONGODB_URI` for the project automatically.

## Adding product images

In the admin product form, choose up to four JPG, PNG, WebP, or GIF files
directly from your device. The app resizes and compresses them before saving,
so no image-hosting link is needed. The combined image data for one product is
limited to 3 MB to stay within the deployment request limit.

## Notes / things worth knowing

- **Admin credentials live in `api/_lib/admins.json` as a plain email and password.**
  Vercel's filesystem is read-only at runtime, so changing them means editing
  the file and redeploying.
- Login is rate-limited to 5 attempts per 15 minutes per IP.
- The WhatsApp number is read from `WHATSAPP_NUMBER` by the API. It is safe to
  expose because it is public contact information; redeploy after changing it
  in Vercel.
- `discountPercentage` is stored per product; the final price shown
  everywhere is calculated as `price - (price * discount / 100)`.
