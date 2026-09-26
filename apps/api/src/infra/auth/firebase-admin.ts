// Repris de ~/flow/apps/api/src/infra/auth/firebase-admin.ts (cache de vérification des tokens inclus).
import { initializeApp, cert, applicationDefault, getApps, type App } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { config } from "../../config.js";

let firebaseApp: App | undefined;

export function initializeFirebase(): App {
  if (getApps().length > 0) {
    firebaseApp = getApps()[0]!;
    return firebaseApp;
  }

  const projectId = config.firebaseProjectId;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (clientEmail && privateKey && !privateKey.includes("placeholder")) {
    firebaseApp = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else if (process.env.FIRESTORE_EMULATOR_HOST) {
    // Émulateurs locaux : aucune clé nécessaire.
    firebaseApp = initializeApp({ projectId });
  } else {
    // Cloud Run : identité du service account attaché.
    firebaseApp = initializeApp({ credential: applicationDefault(), projectId });
  }
  return firebaseApp;
}

// Cache de vérification (évite de re-vérifier le même token à chaque requête)
const tokenCache = new Map<string, { decoded: DecodedIdToken; expiresAt: number }>();
const VERIFY_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 200;

export async function verifyIdToken(token: string): Promise<DecodedIdToken> {
  if (!firebaseApp) initializeFirebase();

  const cacheKey = token.slice(0, 40);
  const now = Date.now();
  const cached = tokenCache.get(cacheKey);
  if (cached && now < cached.expiresAt) return cached.decoded;

  const decoded = await getAuth().verifyIdToken(token);

  if (tokenCache.size >= MAX_CACHE_SIZE) {
    const oldest = tokenCache.keys().next().value;
    if (oldest) tokenCache.delete(oldest);
  }
  tokenCache.set(cacheKey, { decoded, expiresAt: Math.min(now + VERIFY_CACHE_TTL_MS, decoded.exp * 1000) });
  return decoded;
}
