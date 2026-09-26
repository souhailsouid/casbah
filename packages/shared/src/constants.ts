import type { Espace, ForfaitId, RestaurantSettings } from "./types.js";

/** Identifiant du seul établissement pour l'instant (multi-établissements = V2). */
export const RESTAURANT_ID = "la-casbah";

export const FORFAITS: Record<ForfaitId, { nom: string; prix: number; dureeMin: number }> = {
  entree: { nom: "L'Entrée aux Bains", prix: 25, dureeMin: 120 },
  rituel: { nom: "Le Rituel Signature", prix: 39, dureeMin: 150 },
  evasion: { nom: "L'Évasion Complète", prix: 49, dureeMin: 180 },
};

export const ESPACES: Espace[] = ["femmes", "hommes"];

/** Acompte par personne (V2 : encaissé via Stripe ; V1 : affiché, réglé sur place). */
export const ACOMPTE_PAR_PERSONNE = 10;

/** Réglages par défaut, copiés dans Firestore à la création de l'établissement. */
export const DEFAULT_SETTINGS: RestaurantSettings = {
  timezone: "Europe/Paris",
  slotMinutes: 60,
  bookingHorizonDays: 30,
  cancelDeadlineHours: 24,
  maxPersonsPerBooking: 7,
  capacityPerSlot: { femmes: 12, hommes: 12 },
  hours: {
    // jour de la semaine : 0 = dimanche … 6 = samedi ; [ouverture, dernier créneau] en heures décimales
    femmes: { default: [9, 13], byDay: { 2: [10, 20] } },
    hommes: { default: [15, 20], byDay: {}, closedDays: [2] },
  },
  closedDates: [],
};

export const COLLECTIONS = {
  RESTAURANTS: "restaurants",
  PROFILES: "profiles",
  reservations: (restaurantId: string) => `restaurants/${restaurantId}/reservations`,
  notifications: (restaurantId: string) => `restaurants/${restaurantId}/notifications`,
  slots: (restaurantId: string) => `restaurants/${restaurantId}/slots`,
} as const;
