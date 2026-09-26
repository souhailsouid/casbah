import { COLLECTIONS, FORFAITS, RESTAURANT_ID, type NotificationChannel, type NotificationEvent, type NotificationLog, type Reservation } from "@casbah/shared";
import { getDb } from "../firestore/client.js";
import { getRestaurant } from "../../domain/restaurant.js";
import { buildIcs, sendEmail } from "./email.js";
import { sendWhatsappTemplate } from "./whatsapp.js";
import { buildMessage, type Audience } from "./templates.js";
import { cancelTokenFor } from "../../domain/tokens.js";

const MAX_ATTEMPTS = 3;
const logs = () => getDb().collection(COLLECTIONS.notifications(RESTAURANT_ID));

type Stored = Omit<NotificationLog, "id"> & { retry: { event: NotificationEvent; audience: Audience; reason?: string } };

/**
 * Point d'entrée unique. Décide des destinataires et des canaux, journalise, envoie sans bloquer l'appelant.
 * Idempotent par (réservation, événement, canal, destinataire) : un événement n'est jamais envoyé deux fois.
 */
export async function notify(event: NotificationEvent, r: Reservation, opts: { reason?: string } = {}): Promise<void> {
  const restaurant = await getRestaurant();
  const plan: { audience: Audience; channel: NotificationChannel; to: string }[] = [];

  // Client : WhatsApp si opt-in, sinon e-mail s'il en a donné un. Jamais les deux (la confirmation vaut aussi par e-mail si demandée).
  if (r.customer.whatsappOptIn) plan.push({ audience: "customer", channel: "whatsapp", to: r.customer.phone });
  if (r.customer.email && (!r.customer.whatsappOptIn || event === "reservation.confirmed")) {
    plan.push({ audience: "customer", channel: "email", to: r.customer.email });
  }
  // Marchand : e-mail toujours (trace), WhatsApp si un numéro est configuré.
  if (event === "reservation.received" || event === "reservation.cancelled") {
    plan.push({ audience: "merchant", channel: "email", to: restaurant.notifyEmail });
    if (restaurant.notifyWhatsapp) plan.push({ audience: "merchant", channel: "whatsapp", to: restaurant.notifyWhatsapp });
  }

  const now = new Date().toISOString();
  const queued: { id: string; log: Stored }[] = [];
  for (const p of plan) {
    const id = `${r.id}_${event}_${p.channel}_${p.audience}`; // idempotence : un doc par combinaison
    const ref = logs().doc(id);
    const exists = (await ref.get()).exists;
    if (exists) continue;
    const msg = buildMessage(event, p.audience, r, { cancelToken: cancelTokenFor(r.id), reason: opts.reason, merchantName: restaurant.name });
    const log: Stored = {
      reservationId: r.id,
      event,
      channel: p.channel,
      audience: p.audience,
      to: p.to,
      template: p.channel === "whatsapp" ? msg.whatsapp.template : msg.email.subject,
      status: "queued",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      retry: { event, audience: p.audience, reason: opts.reason },
    };
    await ref.set(log);
    queued.push({ id, log });
  }

  // Envoi hors du chemin critique de la requête.
  for (const q of queued) {
    void deliver(q.id, q.log, r).catch((err) => console.error("[notify] échec inattendu", q.id, err));
  }
}

async function deliver(id: string, log: Stored, r: Reservation): Promise<void> {
  const restaurant = await getRestaurant();
  const msg = buildMessage(log.event, log.audience, r, { cancelToken: cancelTokenFor(r.id), reason: log.retry.reason, merchantName: restaurant.name });
  const ref = logs().doc(id);
  try {
    let providerMessageId: string;
    if (log.channel === "whatsapp") {
      const res = await sendWhatsappTemplate({ to: log.to, template: msg.whatsapp.template, language: msg.whatsapp.language, bodyParams: msg.whatsapp.params });
      providerMessageId = res.id;
    } else {
      const locale = log.audience === "merchant" ? "fr" : r.customer.locale;
      const attachments =
        log.event === "reservation.confirmed" && log.audience === "customer"
          ? [{
              filename: "reservation-la-casbah.ics",
              content: Buffer.from(
                buildIcs({
                  uid: r.id,
                  date: r.date,
                  hour: r.hour,
                  durationMin: FORFAITS[r.forfait].dureeMin,
                  title: `La Casbah — ${FORFAITS[r.forfait].nom}`,
                  location: "La Casbah, 77680 Roissy-en-Brie",
                  description: msg.text,
                }),
              ).toString("base64"),
            }]
          : undefined;
      const res = await sendEmail({ to: log.to, message: msg.email, locale, attachments });
      providerMessageId = res.id;
    }
    await ref.update({ status: "sent", providerMessageId, attempts: log.attempts + 1, updatedAt: new Date().toISOString(), error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ level: "error", service: "notify", id, channel: log.channel, to: log.to, message }));
    await ref.update({ status: "failed", error: message, attempts: log.attempts + 1, updatedAt: new Date().toISOString() });
  }
}

/** Relance des envois en échec (cron). */
export async function retryFailed(): Promise<{ retried: number }> {
  const snap = await logs().where("status", "==", "failed").where("attempts", "<", MAX_ATTEMPTS).limit(50).get();
  let retried = 0;
  for (const doc of snap.docs) {
    const log = doc.data() as Stored;
    const rSnap = await getDb().collection(COLLECTIONS.reservations(RESTAURANT_ID)).doc(log.reservationId).get();
    if (!rSnap.exists) continue;
    await deliver(doc.id, log, { id: rSnap.id, ...(rSnap.data() as Omit<Reservation, "id">) });
    retried++;
  }
  return { retried };
}

/** Mise à jour du statut de livraison depuis un webhook fournisseur (WhatsApp, Resend). */
export async function markProviderStatus(providerMessageId: string, status: "sent" | "delivered" | "read" | "failed", error?: string): Promise<boolean> {
  const snap = await logs().where("providerMessageId", "==", providerMessageId).limit(1).get();
  if (snap.empty) return false;
  const doc = snap.docs[0]!;
  const current = doc.data() as Stored;
  const order = ["queued", "sent", "delivered", "read"];
  // Ne pas régresser (un « delivered » arrivé après « read » est ignoré).
  if (status !== "failed" && order.indexOf(status) < order.indexOf(current.status)) return true;
  await doc.ref.update({ status, error: error ?? null, updatedAt: new Date().toISOString() });
  return true;
}

export async function notificationsFor(reservationId: string): Promise<NotificationLog[]> {
  const snap = await logs().where("reservationId", "==", reservationId).orderBy("createdAt", "asc").get();
  return snap.docs.map((d) => {
    const { retry: _r, ...rest } = d.data() as Stored;
    return { id: d.id, ...rest };
  });
}
