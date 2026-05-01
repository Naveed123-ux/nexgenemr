import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI
if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable. Add it in the Vars sidebar.")
}

type GlobalWithMongo = typeof globalThis & {
  _mongoClient?: Promise<MongoClient>
}

const globalWithMongo = global as GlobalWithMongo

export async function getMongoClient() {
  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri).connect()
  }
  return globalWithMongo._mongoClient!
}

export async function getDb() {
  const client = await getMongoClient()
  const dbName = process.env.MONGODB_DB || "help_center"
  return client.db(dbName)
}
