import { getFirestore, type Firestore } from "firebase-admin/firestore";

let db: Firestore | undefined;

export function getDb(): Firestore {
  if (!db) {
    db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
  }
  return db;
}
