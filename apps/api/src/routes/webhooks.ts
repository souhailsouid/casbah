import type { FastifyInstance, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { extractInbound, extractStatuses, verifyMetaSignature } from "../infra/notifications/whatsapp.js";
import { verifyResendSignature } from "../infra/notifications/email.js";
import { markProviderStatus } from "../infra/notifications/notify.js";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}

/** Webhooks fournisseurs. Le corps brut est conservé pour vérifier les signatures HMAC. */
export async function webhookRoutes(app: FastifyInstance) {
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req: FastifyRequest, body: string, done) => {
    req.rawBody = body;
    try {
      done(null, body.length ? JSON.parse(body) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  /** Vérification initiale de l'URL par Meta. */
  app.get("/whatsapp", async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    if (q["hub.mode"] === "subscribe" && q["hub.verify_token"] && q["hub.verify_token"] === config.whatsapp.verifyToken) {
      return reply.type("text/plain").send(q["hub.challenge"] ?? "");
    }
    return reply.status(403).send({ error: "verify_token invalide" });
  });

  /** Statuts de livraison et messages entrants. */
  app.post("/whatsapp", async (req, reply) => {
    if (!verifyMetaSignature(req.rawBody ?? "", req.headers["x-hub-signature-256"] as string | undefined)) {
      req.log.warn("[webhook whatsapp] signature invalide");
      return reply.status(401).send({ error: "signature invalide" });
    }
    for (const s of extractStatuses(req.body)) {
      await markProviderStatus(s.id, s.status, s.error);
    }
    for (const m of extractInbound(req.body)) {
      // V1 : journal seulement. V2 : « 1 » pour confirmer côté marchand, réponses client dans l'admin.
      req.log.info({ from: m.from, text: m.text.slice(0, 200) }, "[webhook whatsapp] message entrant");
    }
    return reply.send({ ok: true });
  });

  /** Événements Resend (email.delivered, email.bounced, email.complained…). */
  app.post("/resend", async (req, reply) => {
    const ok = verifyResendSignature(req.rawBody ?? "", {
      id: req.headers["svix-id"] as string | undefined,
      timestamp: req.headers["svix-timestamp"] as string | undefined,
      signature: req.headers["svix-signature"] as string | undefined,
    });
    if (!ok) return reply.status(401).send({ error: "signature invalide" });
    const body = req.body as { type?: string; data?: { email_id?: string } };
    const id = body.data?.email_id;
    if (id) {
      if (body.type === "email.delivered") await markProviderStatus(id, "delivered");
      else if (body.type === "email.opened") await markProviderStatus(id, "read");
      else if (body.type === "email.bounced" || body.type === "email.complained" || body.type === "email.delivery_delayed") {
        await markProviderStatus(id, "failed", body.type);
      }
    }
    return reply.send({ ok: true });
  });
}
