import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { RESTAURANT_ID, decisionSchema, listReservationsQuerySchema, restaurantUpdateSchema, todayIn } from "@casbah/shared";
import { requireAdmin, requireAuth } from "../infra/auth/auth-middleware.js";
import { getReservation, listReservations, transition } from "../domain/reservations.js";
import { getRestaurant, updateRestaurant } from "../domain/restaurant.js";
import { notificationsFor, notify } from "../infra/notifications/notify.js";

const idParams = z.object({ id: z.string().min(1).max(64) });

/** Routes marchand : ID token Firebase + claim admin sur cet établissement. */
export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireAdmin(RESTAURANT_ID));
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get("/me", async (req) => ({ uid: req.user!.uid, email: req.user!.email, restaurantId: req.user!.restaurantId }));

  r.get("/reservations", { schema: { querystring: listReservationsQuerySchema } }, async (req) => {
    const items = await listReservations(req.query);
    return { items };
  });

  /** Vue « pile » : en attente + agenda d'aujourd'hui et de demain, en une requête. */
  r.get("/inbox", async () => {
    const { settings } = await getRestaurant();
    const today = todayIn(settings.timezone);
    const [pending, upcoming] = await Promise.all([
      listReservations({ status: "pending", limit: 200 }),
      listReservations({ status: "confirmed", from: today, limit: 200 }),
    ]);
    return { today, pending, upcoming };
  });

  r.get("/reservations/:id", { schema: { params: idParams } }, async (req, reply) => {
    const reservation = await getReservation(req.params.id);
    if (!reservation) return reply.status(404).send({ error: "Réservation introuvable", code: "not_found" });
    const notifications = await notificationsFor(reservation.id);
    return { reservation, notifications };
  });

  r.post("/reservations/:id/confirm", { schema: { params: idParams, body: decisionSchema.optional() } }, async (req) => {
    const res = await transition(req.params.id, "confirmed", `admin:${req.user!.uid}`, req.body?.reason);
    await notify("reservation.confirmed", res);
    return { reservation: res };
  });

  r.post("/reservations/:id/decline", { schema: { params: idParams, body: decisionSchema.optional() } }, async (req) => {
    const res = await transition(req.params.id, "declined", `admin:${req.user!.uid}`, req.body?.reason);
    await notify("reservation.declined", res, { reason: req.body?.reason });
    return { reservation: res };
  });

  r.post("/reservations/:id/cancel", { schema: { params: idParams, body: decisionSchema.optional() } }, async (req) => {
    const res = await transition(req.params.id, "cancelled", `admin:${req.user!.uid}`, req.body?.reason);
    await notify("reservation.cancelled", res);
    return { reservation: res };
  });

  r.post("/reservations/:id/no-show", { schema: { params: idParams } }, async (req) => {
    const res = await transition(req.params.id, "no_show", `admin:${req.user!.uid}`);
    return { reservation: res };
  });

  r.get("/restaurant", async () => getRestaurant(true));

  r.put("/restaurant", { schema: { body: restaurantUpdateSchema } }, async (req) => {
    const patch = { ...req.body, notifyWhatsapp: req.body.notifyWhatsapp || undefined };
    return updateRestaurant(patch);
  });
}
