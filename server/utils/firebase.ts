import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let _db: ReturnType<typeof getFirestore> | null = null

/**
 * Get a singleton Firestore instance using Firebase Admin SDK.
 * Connects to the 'devcodbinitial' database in the devcoerp project.
 */
export function useFirestoreAdmin() {
  if (_db) return _db

  if (getApps().length === 0) {
    const saPath = resolve(process.cwd(), 'firebase-service-account.json')
    const sa = JSON.parse(readFileSync(saPath, 'utf-8'))

    initializeApp({
      credential: cert(sa),
      projectId: sa.project_id,
    })
  }

  _db = getFirestore('devcodbinitial')
  return _db
}
