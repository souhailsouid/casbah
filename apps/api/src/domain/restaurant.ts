import { COLLECTIONS, DEFAULT_SETTINGS, RESTAURANT_ID, type Restaurant, type RestaurantSettings } from "@casbah/shared";
import { getDb } from "../infra/firestore/client.js";

const CACHE_TTL_MS = 60_000;
let cache: { value: Restaurant; expiresAt: number } | null = null;

/** Lit l'établissement (avec cache 60 s). Le crée avec les réglages par défaut s'il n'existe pas encore. */
export async function getRestaurant(force = false): Promise<Restaurant> {
  if (!force && cache && Date.now() < cache.expiresAt) return cache.value;
  const ref = getDb().collection(COLLECTIONS.RESTAURANTS).doc(RESTAURANT_ID);
  const snap = await ref.get();
  let value: Restaurant;
  if (snap.exists) {
    const data = snap.data() as Omit<Restaurant, "id">;
    value = { id: RESTAURANT_ID, ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings } };
  } else {
    value = {
      id: RESTAURANT_ID,
      name: "La Casbah",
      notifyEmail: process.env.MERCHANT_EMAIL ?? "contact@example.com",
      settings: DEFAULT_SETTINGS,
      createdAt: new Date().toISOString(),
    };
    const { id: _id, ...doc } = value;
    await ref.set(doc);
  }
  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function updateRestaurant(patch: Partial<Omit<Restaurant, "id" | "createdAt">> & { settings?: RestaurantSettings }): Promise<Restaurant> {
  const ref = getDb().collection(COLLECTIONS.RESTAURANTS).doc(RESTAURANT_ID);
  await ref.set(patch, { merge: true });
  cache = null;
  return getRestaurant(true);
}
