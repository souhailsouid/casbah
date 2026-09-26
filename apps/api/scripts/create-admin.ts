/**
 * Crée (ou met à jour) le compte marchand et pose le claim admin.
 * Usage : pnpm -C apps/api create-admin <email> [mot-de-passe]
 * Sans mot de passe : l'utilisateur doit exister (ou utiliser « mot de passe oublié »).
 */
import "dotenv/config";
import { getAuth } from "firebase-admin/auth";
import { COLLECTIONS, RESTAURANT_ID } from "@casbah/shared";
import { initializeFirebase } from "../src/infra/auth/firebase-admin.js";
import { setUserClaims } from "../src/infra/auth/claims.js";
import { getDb } from "../src/infra/firestore/client.js";

const [email, password] = process.argv.slice(2);
if (!email) {
  console.error("Usage : create-admin <email> [mot-de-passe]");
  process.exit(1);
}

initializeFirebase();
const auth = getAuth();

let user = await auth.getUserByEmail(email).catch(() => null);
if (!user) {
  if (!password) {
    console.error("Utilisateur inconnu : fournir un mot de passe pour le créer.");
    process.exit(1);
  }
  user = await auth.createUser({ email, password, emailVerified: true });
  console.log("Utilisateur créé :", user.uid);
} else if (password) {
  await auth.updateUser(user.uid, { password });
  console.log("Mot de passe mis à jour.");
}

await setUserClaims(user.uid, { role: "admin", restaurantId: RESTAURANT_ID });
await getDb().collection(COLLECTIONS.PROFILES).doc(user.uid).set(
  { uid: user.uid, email, role: "admin", restaurantId: RESTAURANT_ID, createdAt: new Date().toISOString() },
  { merge: true },
);
console.log(`Claim admin posé pour ${email} (restaurant ${RESTAURANT_ID}). Se reconnecter pour rafraîchir le token.`);
