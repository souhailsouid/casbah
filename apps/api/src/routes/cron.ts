import type { FastifyInstance } from "fastify";
import { addDays, todayIn } from "@casbah/shared";
import { config } from "../config.js";
import { confirmedBefore, confirmedOn, pendingBefore, transition } from "../domain/reservations.js";
import { getRestaurant } from "../domain/restaurant.js";
import { notify, retryFailed } from "../infra/notifications/notify.js";

/** Tâches planifiées (Cloud Scheduler). Protégées par un secret partagé, pas par Firebase Auth. */
export async function cronRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (req, reply) => {
    if (!config.cronSecret || req.headers["x-cron-secret"] !== config.cronSecret) {
      return reply.status(403).send({ error: "Secret cron invalide" });
    }
  });

  /** Rappels J-1 (à lancer vers 10h). Idempotent : notify() ne renvoie jamais deux fois le même événement. */
  app.post("/reminders", async () => {
    const { settings } = await getRestaurant();
    const tomorrow = addDays(todayIn(settings.timezone), 1);
    const items = await confirmedOn(tomorrow);
    for (const r of items) await notify("reservation.reminder", r);
    return { ok: true, date: tomorrow, reminders: items.length };
  });

  /** Clôture : « terminée » pour les confirmées passées, « refusée » (sans notification) pour les demandes restées sans réponse. */
  app.post("/complete-past", async () => {
    const { settings } = await getRestaurant();
    const today = todayIn(settings.timezone);
    const done = await confirmedBefore(today);
    for (const r of done) await transition(r.id, "completed", "system");
    const stale = await pendingBefore(today);
    for (const r of stale) await transition(r.id, "declined", "system", "Créneau passé sans réponse");
    return { ok: true, completed: done.length, expired: stale.length };
  });

  /** Relance des notifications en échec (3 tentatives max). */
  app.post("/retry-notifications", async () => retryFailed());
}
