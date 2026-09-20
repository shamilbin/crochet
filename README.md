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
| `MONGODB_URI` | Vercel + local | from Atlas |
| `JWT_SECRET` | Vercel + local | any long random string |
| `NODE_ENV` | Vercel | set to `production` |
| `VITE_WHATSAPP_NUMBER` | Vercel + local | e.g. `919645213232` (country code, no `+` or spaces) |

## 4. Seed starter categories (optional)

```bash
export MONGODB_URI="your-connection-string"
node scripts/seed.js
```

This adds Gifts, Bags, Keychains, Bouquets. You can also add/remove
categories later from `/admin/dashboard`.

## 5. Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

This starts the Express API on **http://localhost:5000** and the React app on
**http://localhost:5173**. Open 5173 in the browser — Vite proxies `/api` to
the backend.

If `MONGODB_URI` is empty, local mode uses an in-memory database (data is
wiped when you stop the server). For data that survives restarts, put your
Atlas connection string in `.env`.

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

## Adding product images (Google Drive)

Since images are stored as links, not uploads:

1. Upload the photo to Google Drive.
2. Right-click → Share → set to "Anyone with the link".
3. Copy the file ID from the share link
   (`https://drive.google.com/file/d/FILE_ID/view`).
4. Use this format in the admin form instead of the share link:
   `https://drive.google.com/uc?export=view&id=FILE_ID`

That direct-view format is what actually renders as an image on the site —
the normal "share" link opens a preview page, not the raw image.

## Notes / things worth knowing

- **Admin credentials live in `api/_lib/admins.json` as a plain email and password.**
  Vercel's filesystem is read-only at runtime, so changing them means editing
  the file and redeploying.
- Login is rate-limited to 5 attempts per 15 minutes per IP.
- The WhatsApp number is read from `VITE_WHATSAPP_NUMBER` (frontend env var,
  safe to expose — it's just a public contact number).
- `discountPercentage` is stored per product; the final price shown
  everywhere is calculated as `price - (price * discount / 100)`.
