import type { ReservationStatus } from "./types.js";

/** Transitions autorisées de la machine à états d'une réservation. */
const TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "declined", "cancelled"],
  confirmed: ["cancelled", "no_show", "completed"],
  declined: [],
  cancelled: [],
  no_show: [],
  completed: [],
};

export function canTransition(from: ReservationStatus, to: ReservationStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Statuts qui occupent de la capacité sur un créneau. */
export const ACTIVE_STATUSES: ReservationStatus[] = ["pending", "confirmed"];

export function isActive(status: ReservationStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export const STATUS_LABELS_FR: Record<ReservationStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  declined: "Refusée",
  cancelled: "Annulée",
  no_show: "Non venue",
  completed: "Terminée",
};
