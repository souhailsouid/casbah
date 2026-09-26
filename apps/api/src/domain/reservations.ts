import { FieldValue } from "firebase-admin/firestore";
import {
  ACOMPTE_PAR_PERSONNE,
  COLLECTIONS,
  FORFAITS,
  RESTAURANT_ID,
  canTransition,
  isActive,
  validateSlot,
  type Actor,
  type CreateReservationInput,
  type Reservation,
  type ReservationStatus,
} from "@casbah/shared";
import { getDb } from "../infra/firestore/client.js";
import { getRestaurant } from "./restaurant.js";
import { verifyCancelToken } from "./tokens.js";

export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

type StoredReservation = Omit<Reservation, "id">;

function slotDocId(date: string, espace: string) {
  return `${date}_${espace}`;
}

function toReservation(id: string, data: StoredReservation): Reservation {
  return { id, ...data };
}

const col = () => getDb().collection(COLLECTIONS.reservations(RESTAURANT_ID));
const slots = () => getDb().collection(COLLECTIONS.slots(RESTAURANT_ID));

/**
 * Crée une demande de réservation dans une transaction :
 * idempotence, anti-doublon, vérification du créneau et de la capacité, incrément du compteur.
 */
export async function createReservation(input: CreateReservationInput): Promise<{ reservation: Reservation; created: boolean }> {
  const restaurant = await getRestaurant();
  const settings = restaurant.settings;

  // Idempotence : même clé → même réservation (le client peut re-soumettre après un timeout).
  const existing = await col().where("idempotencyKey", "==", input.idempotencyKey).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0]!;
    return { reservation: toReservation(doc.id, doc.data() as StoredReservation), created: false };
  }

  if (input.persons > settings.maxPersonsPerBooking) {
    throw new DomainError("too_many_persons", `Maximum ${settings.maxPersonsPerBooking} personnes par réservation — passez par l'offre Groupes.`);
  }
  const slot = validateSlot({ settings, espace: input.espace, date: input.date, hour: input.hour });
  if (!slot.ok) throw new DomainError(slot.reason, "Ce créneau n'est pas réservable.");

  // Anti-doublon : même téléphone, même créneau, demande encore active.
  const dup = await col()
    .where("customer.phone", "==", input.customer.phone)
    .where("date", "==", input.date)
    .where("hour", "==", input.hour)
    .where("status", "in", ["pending", "confirmed"])
    .limit(1)
    .get();
  if (!dup.empty) throw new DomainError("duplicate", "Une demande existe déjà pour ce numéro sur ce créneau.", 409);

  const now = new Date().toISOString();
  const forfait = FORFAITS[input.forfait];
  const stored: StoredReservation = {
    restaurantId: RESTAURANT_ID,
    status: "pending",
    forfait: input.forfait,
    espace: input.espace,
    persons: input.persons,
    date: input.date,
    hour: input.hour,
    priceTotal: forfait.prix * input.persons,
    depositDue: ACOMPTE_PAR_PERSONNE * input.persons,
    customer: {
      ...input.customer,
      whatsappOptInAt: input.customer.whatsappOptIn ? now : undefined,
    },
    notes: input.notes,
    source: "web",
    idempotencyKey: input.idempotencyKey,
    createdAt: now,
    updatedAt: now,
    history: [{ at: now, from: null, to: "pending", by: "customer" }],
  };

  const ref = col().doc();
  const slotRef = slots().doc(slotDocId(input.date, input.espace));
  const capacity = settings.capacityPerSlot[input.espace];

  await getDb().runTransaction(async (tx) => {
    const slotSnap = await tx.get(slotRef);
    const counts = (slotSnap.data()?.counts as Record<string, number> | undefined) ?? {};
    const used = counts[String(input.hour)] ?? 0;
    if (used + input.persons > capacity) {
      throw new DomainError("full", `Il ne reste que ${Math.max(0, capacity - used)} place(s) sur ce créneau.`, 409);
    }
    tx.set(ref, stored);
    tx.set(
      slotRef,
      { date: input.date, espace: input.espace, updatedAt: now, counts: { [String(input.hour)]: FieldValue.increment(input.persons) } },
      { merge: true },
    );
  });

  return { reservation: toReservation(ref.id, stored), created: true };
}

/** Transition d'état avec journal et mise à jour du compteur de créneau. */
export async function transition(id: string, to: ReservationStatus, by: Actor, reason?: string): Promise<Reservation> {
  const ref = col().doc(id);
  const now = new Date().toISOString();
  let result: Reservation | null = null;

  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new DomainError("not_found", "Réservation introuvable", 404);
    const data = snap.data() as StoredReservation;
    if (!canTransition(data.status, to)) {
      throw new DomainError("invalid_transition", `Impossible de passer de « ${data.status} » à « ${to} »`, 409);
    }
    const patch: Partial<StoredReservation> = {
      status: to,
      updatedAt: now,
      history: [...data.history, { at: now, from: data.status, to, by, reason }],
    };
    if (to === "confirmed") {
      patch.confirmedAt = now;
      patch.decidedBy = by;
    }
    if (to === "declined") patch.decidedBy = by;
    tx.update(ref, patch);

    // Libère la capacité quand la réservation cesse d'occuper le créneau (sauf « terminée » : créneau passé).
    if (isActive(data.status) && !isActive(to) && to !== "completed") {
      const slotRef = slots().doc(slotDocId(data.date, data.espace));
      tx.set(slotRef, { updatedAt: now, counts: { [String(data.hour)]: FieldValue.increment(-data.persons) } }, { merge: true });
    }
    result = toReservation(id, { ...data, ...patch } as StoredReservation);
  });

  return result!;
}

export async function getReservation(id: string): Promise<Reservation | null> {
  const snap = await col().doc(id).get();
  return snap.exists ? toReservation(snap.id, snap.data() as StoredReservation) : null;
}

/** Retrouve une réservation par (id, jeton d'annulation). */
export async function findByCancelToken(id: string, token: string): Promise<Reservation | null> {
  if (!verifyCancelToken(id, token)) return null;
  return getReservation(id);
}

/** Annulation par le client : autorisée jusqu'à `cancelDeadlineHours` avant le créneau. */
export async function cancelByCustomer(id: string, token: string): Promise<Reservation> {
  const r = await findByCancelToken(id, token);
  if (!r) throw new DomainError("not_found", "Lien d'annulation invalide", 404);
  if (!isActive(r.status)) throw new DomainError("invalid_transition", "Cette réservation n'est plus active", 409);
  const { settings } = await getRestaurant();
  const slotTime = new Date(`${r.date}T${String(r.hour).padStart(2, "0")}:00:00+02:00`); // approximation Europe/Paris
  const hoursLeft = (slotTime.getTime() - Date.now()) / 3_600_000;
  if (hoursLeft < settings.cancelDeadlineHours) {
    throw new DomainError("too_late", `Annulation possible jusqu'à ${settings.cancelDeadlineHours} h avant. Appelez-nous.`, 409);
  }
  return transition(r.id, "cancelled", "customer");
}

export async function listReservations(q: { status?: ReservationStatus; from?: string; to?: string; limit: number }): Promise<Reservation[]> {
  let query: FirebaseFirestore.Query = col();
  if (q.status) query = query.where("status", "==", q.status);
  if (q.from) query = query.where("date", ">=", q.from);
  if (q.to) query = query.where("date", "<=", q.to);
  query = query.orderBy("date", "asc").orderBy("hour", "asc").limit(q.limit);
  const snap = await query.get();
  return snap.docs.map((d) => toReservation(d.id, d.data() as StoredReservation));
}

/** Réservations confirmées pour une date (rappels J-1). */
export async function confirmedOn(date: string): Promise<Reservation[]> {
  const snap = await col().where("status", "==", "confirmed").where("date", "==", date).get();
  return snap.docs.map((d) => toReservation(d.id, d.data() as StoredReservation));
}

/** Demandes restées en attente dont la date est passée (à expirer). */
export async function pendingBefore(date: string): Promise<Reservation[]> {
  const snap = await col().where("status", "==", "pending").where("date", "<", date).limit(500).get();
  return snap.docs.map((d) => toReservation(d.id, d.data() as StoredReservation));
}

/** Réservations confirmées dont la date est passée (à clôturer). */
export async function confirmedBefore(date: string): Promise<Reservation[]> {
  const snap = await col().where("status", "==", "confirmed").where("date", "<", date).limit(500).get();
  return snap.docs.map((d) => toReservation(d.id, d.data() as StoredReservation));
}
