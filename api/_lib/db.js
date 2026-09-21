import mongoose from 'mongoose';

// Cache the connection across serverless invocations so we don't
// open a new MongoDB connection on every request (Vercel reuses
// warm function instances between calls).
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

async function resolveUri() {
  const uri = process.env.MONGODB_URI?.trim();
  if (uri) return uri;

  throw new Error('MONGODB_URI is not set. Add a persistent MongoDB Atlas connection string.');
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = resolveUri().then((uri) =>
      mongoose.connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 10_000 })
    );
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    // Do not permanently cache a rejected connection. This lets the API
    // recover after Atlas network access or credentials are corrected.
    cached.conn = null;
    cached.promise = null;
    throw err;
  }
}
