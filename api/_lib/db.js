import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Cache the connection across serverless invocations so we don't
// open a new MongoDB connection on every request (Vercel reuses
// warm function instances between calls).
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Add it in your environment variables.');
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
