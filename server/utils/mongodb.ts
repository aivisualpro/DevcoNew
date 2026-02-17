import { MongoClient } from 'mongodb'

let _client: MongoClient | null = null

/**
 * Get a singleton MongoClient instance.
 * Reads the connection string from Nuxt runtimeConfig (mongodbUri)
 * which is populated from MONGODB_URI in .env.local via nuxt.config.ts.
 */
export async function useMongoClient(): Promise<MongoClient> {
  if (_client) return _client

  const config = useRuntimeConfig()
  const uri = config.mongodbUri || process.env.MONGODB_URI

  if (!uri) {
    console.error('[MongoDB] Available runtimeConfig keys:', Object.keys(config))
    throw new Error('MONGODB_URI is not set in environment variables or runtime config')
  }

  _client = new MongoClient(uri as string)
  await _client.connect()

  return _client
}

