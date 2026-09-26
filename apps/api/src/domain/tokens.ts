import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

/**
 * Jeton d'annulation client = HMAC-SHA256(secret serveur, id de réservation).
 * Rien n'est stocké : le jeton se recalcule à la demande (confirmation, rappel, relance)
 * et se vérifie en temps constant. Le lien porte l'id et le jeton.
 */
export function cancelTokenFor(reservationId: string): string {
  return createHmac("sha256", config.cancelTokenSecret).update(reservationId).digest("base64url");
}

export function verifyCancelToken(reservationId: string, token: string): boolean {
  if (!token || token.length > 128) return false;
  const a = Buffer.from(cancelTokenFor(reservationId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
