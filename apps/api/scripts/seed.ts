/**
 * Initialise l'établissement dans Firestore avec les réglages par défaut.
 * Usage : pnpm -C apps/api seed <email-notifications> [whatsapp-marchand-E164]
 */
import "dotenv/config";
import { initializeFirebase } from "../src/infra/auth/firebase-admin.js";
import { getRestaurant, updateRestaurant } from "../src/domain/restaurant.js";

const [notifyEmail, notifyWhatsapp] = process.argv.slice(2);
if (!notifyEmail) {
  console.error("Usage : seed <email-notifications> [whatsapp-marchand-E164]");
  process.exit(1);
}

initializeFirebase();
await getRestaurant();
const r = await updateRestaurant({ notifyEmail, notifyWhatsapp: notifyWhatsapp || undefined });
console.log("Établissement prêt :", { id: r.id, name: r.name, notifyEmail: r.notifyEmail, notifyWhatsapp: r.notifyWhatsapp ?? "(aucun)" });
