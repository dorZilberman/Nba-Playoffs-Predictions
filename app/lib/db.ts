import mongoose from "mongoose"

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local")
}

const uri: string = process.env.MONGODB_URI

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null }

if (!global.mongoose) {
  global.mongoose = cached
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    }

    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      console.log("✅ MongoDB connected successfully")
      return mongoose
    }).catch((error) => {
      console.error("❌ MongoDB connection error:", error.message)
      throw error
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

// Startup connection check
let startupCheckInitiated = false

export async function initDatabaseConnection() {
  if (startupCheckInitiated) {
    return
  }
  startupCheckInitiated = true

  console.log("\n🔄 [DB] Checking MongoDB connection on startup...")
  console.log(`   URI: ${uri.replace(/:[^:@]+@/, ':****@')}`) // Hide password in logs

  try {
    await dbConnect()
    console.log("✅ [DB] MongoDB connected successfully!\n")
  } catch (error: any) {
    console.error("\n❌ [DB] MongoDB connection failed on startup:")
    console.error(`   Error: ${error.message}`)
    console.error("\n   Please check:")
    console.error("   1. MONGODB_URI is set correctly in .env.local")
    console.error("   2. Your IP is whitelisted in MongoDB Atlas (Network Access)")
    console.error("   3. Database user credentials are correct")
    console.error("   4. Password is URL-encoded if it contains special characters\n")
  }
}

// Auto-init in development
if (process.env.NODE_ENV === "development" && typeof window === "undefined") {
  // Use setImmediate to ensure it runs after module load
  if (typeof setImmediate !== "undefined") {
    setImmediate(() => {
      initDatabaseConnection()
    })
  } else {
    // Fallback for environments without setImmediate
    setTimeout(() => {
      initDatabaseConnection()
    }, 100)
  }
}

export default dbConnect
