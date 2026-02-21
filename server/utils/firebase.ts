import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

let _db: ReturnType<typeof getFirestore> | null = null

/**
 * Get a singleton Firestore instance using Firebase Admin SDK.
 * Connects to the 'devcodbinitial' database in the devcoerp project.
 *
 * Credential resolution order:
 * 1. FIREBASE_SERVICE_ACCOUNT env var (JSON string — for Vercel)
 * 2. GOOGLE_APPLICATION_CREDENTIALS env var (file path)
 * 3. Local firebase-service-account.json file (dev)
 */
export function useFirestoreAdmin() {
  if (_db)
    return _db

  if (getApps().length === 0) {
    let sa: any

    // 1. Try env var with JSON string (Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      }
      catch (e) {
        console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT env var:', e)
      }
    }

    // 2. Try GOOGLE_APPLICATION_CREDENTIALS env var (file path)
    if (!sa && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8'))
      }
      catch (e) {
        console.error('[Firebase] Failed to read GOOGLE_APPLICATION_CREDENTIALS:', e)
      }
    }

    // 3. Try local file (dev)
    if (!sa) {
      const saPath = resolve(process.cwd(), 'firebase-service-account.json')
      if (existsSync(saPath)) {
        sa = JSON.parse(readFileSync(saPath, 'utf-8'))
      }
    }

    if (!sa) {
      throw new Error(
        'Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT env var (JSON string) '
        + 'or place firebase-service-account.json in the project root.',
      )
    }

    initializeApp({
      credential: cert(sa),
      projectId: sa.project_id,
    })
  }

  _db = getFirestore('devcodbinitial')
  return _db
}
