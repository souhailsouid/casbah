import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  COLLECTIONS,
  FORFAITS,
  RESTAURANT_ID,
  addDays,
  availabilityQuerySchema,
  buildAvailability,
  createReservationSchema,
  isActive,
  todayIn,
  type SlotCounter,
} from "@casbah/shared";
import { getDb } from "../infra/firestore/client.js";
import { getRestaurant } from "../domain/restaurant.js";
import { cancelByCustomer, createReservation, findByCancelToken } from "../domain/reservations.js";
import { notify } from "../infra/notifications/notify.js";

const cancelParams = z.object({ id: z.string().min(1).max(64), token: z.string().min(16).max(128) });

export async function publicRoutes(app: FastifyInstance) {
  const r = app.withTypeProvider<ZodTypeProvider>();

  /** Créneaux ouverts + affluence réelle (remplace la simulation du site). */
  r.get("/availability", { schema: { querystring: availabilityQuerySchema } }, async (req) => {
    const { settings } = await getRestaurant();
    const from = req.query.from ?? todayIn(settings.timezone);
    const to = addDays(from, req.query.days - 1);
    const snap = await getDb()
      .collection(COLLECTIONS.slots(RESTAURANT_ID))
      .where("espace", "==", req.query.espace)
      .where("date", ">=", from)
      .where("date", "<=", to)
      .get();
    const counters: Record<string, SlotCounter> = {};
    for (const d of snap.docs) {
      const c = d.data() as SlotCounter;
      counters[c.date] = c;
    }
    return {
      espace: req.query.espace,
      maxPersons: settings.maxPersonsPerBooking,
      days: buildAvailability({ settings, espace: req.query.espace, from, days: req.query.days, counters }),
    };
  });

  /** Création d'une demande. Rate-limitée par IP, idempotente, pot de miel. */
  r.post(
    "/reservations",
    {
      schema: { body: createReservationSchema },
      config: { rateLimit: { max: 5, timeWindow: "10 minutes" } },
    },
    async (req, reply) => {
      if (req.body.website) {
        // Pot de miel rempli : on répond comme si tout allait bien, sans rien créer.
        req.log.warn({ ip: req.ip }, "[reservations] pot de miel");
        return reply.status(201).send({ id: "ok", status: "pending" });
      }
      const { reservation, created } = await createReservation(req.body);
      if (created) await notify("reservation.received", reservation);
      return reply.status(created ? 201 : 200).send({
        id: reservation.id,
        status: reservation.status,
        date: reservation.date,
        hour: reservation.hour,
        persons: reservation.persons,
        forfait: reservation.forfait,
        priceTotal: reservation.priceTotal,
        depositDue: reservation.depositDue,
      });
    },
  );

  /** Résumé pour la page d'annulation (lien reçu par le client). */
  r.get("/reservations/:id/cancel/:token", { schema: { params: cancelParams } }, async (req, reply) => {
    const res = await findByCancelToken(req.params.id, req.params.token);
    if (!res) return reply.status(404).send({ error: "Lien invalide", code: "not_found" });
    const { settings } = await getRestaurant();
    return {
      id: res.id,
      status: res.status,
      date: res.date,
      hour: res.hour,
      persons: res.persons,
      forfait: FORFAITS[res.forfait].nom,
      espace: res.espace,
      name: res.customer.name,
      canCancel: isActive(res.status),
      cancelDeadlineHours: settings.cancelDeadlineHours,
    };
  });

  r.post("/reservations/:id/cancel/:token", { schema: { params: cancelParams }, config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } }, async (req) => {
    const res = await cancelByCustomer(req.params.id, req.params.token);
    await notify("reservation.cancelled", res);
    return { id: res.id, status: res.status };
  });
}
