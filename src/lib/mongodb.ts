import { MongoClient, Db } from "mongodb";
import { localDbInstance } from "./localDb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/tasktracker";
const options = {
  serverSelectionTimeoutMS: 2000, // Quick 2s timeout so we don't hang if local mongodb is down
};

let clientPromise: Promise<MongoClient> | null = null;
let useLocalFallback = false;

interface GlobalWithMongo extends Global {
  _mongoClientPromise?: Promise<MongoClient>;
}

declare const global: GlobalWithMongo;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    try {
      const client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    } catch (e) {
      useLocalFallback = true;
    }
  }
  clientPromise = global._mongoClientPromise || null;
} else {
  try {
    const client = new MongoClient(uri, options);
    clientPromise = client.connect();
  } catch (e) {
    useLocalFallback = true;
  }
}

export default clientPromise;

export async function getDb(dbName: string = "tasktracker"): Promise<any> {
  // If fallback already detected
  if (useLocalFallback) {
    return localDbInstance;
  }

  if (clientPromise) {
    try {
      const client = await clientPromise;
      return client.db(dbName);
    } catch (error: any) {
      console.warn(
        `[MongoDB] Could not connect to '${uri}' (${error.message}). Switching to zero-config local storage (.data/db.json) for instant preview.`
      );
      useLocalFallback = true;
      return localDbInstance;
    }
  }

  return localDbInstance;
}
