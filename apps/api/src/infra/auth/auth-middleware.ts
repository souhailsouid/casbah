import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { verifyIdToken } from "./firebase-admin.js";
import { extractClaims, type Role } from "./claims.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: { uid: string; email?: string; role?: Role; restaurantId?: string };
  }
}

/** Exige un ID token Firebase valide (Authorization: Bearer …). À enregistrer sur les routes /admin. */
export const requireAuth: preHandlerHookHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Authentification requise", code: "UNAUTHENTICATED" });
  }
  try {
    const decoded = await verifyIdToken(header.slice(7));
    const claims = extractClaims(decoded);
    req.user = { uid: decoded.uid, email: decoded.email, role: claims?.role, restaurantId: claims?.restaurantId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const expired = message.includes("expired");
    req.log.warn({ err: message, url: req.url }, "[auth] token invalide");
    return reply.status(401).send({
      error: expired ? "Session expirée, reconnectez-vous" : "Token invalide",
      code: expired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
    });
  }
};

/** Exige le rôle admin ET que la ressource appartienne au restaurant du claim. */
export function requireAdmin(restaurantId: string): preHandlerHookHandler {
  return async (req, reply) => {
    if (req.user?.role !== "admin" || req.user.restaurantId !== restaurantId) {
      return reply.status(403).send({ error: "Accès réservé au marchand", code: "FORBIDDEN" });
    }
  };
}
