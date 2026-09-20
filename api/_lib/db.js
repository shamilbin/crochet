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

  if (process.env.VERCEL) {
    throw new Error('MONGODB_URI is not set. Add it in your environment variables.');
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  if (!global._mongoMemory) {
    console.log('No MONGODB_URI set — starting an in-memory database for local dev.');
    global._mongoMemory = await MongoMemoryServer.create();
  }
  return global._mongoMemory.getUri();
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = resolveUri().then((uri) =>
      mongoose.connect(uri, { bufferCommands: false })
    );
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
