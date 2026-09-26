// .env en développement seulement (en prod, Cloud Run injecte les variables).
if (process.env.NODE_ENV !== "production") {
  const { default: dotenv } = await import("dotenv");
  const { resolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });
}

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { hasZodFastifySchemaValidationErrors, serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { config } from "./config.js";
import { initializeFirebase } from "./infra/auth/firebase-admin.js";
import { DomainError } from "./domain/reservations.js";
import { publicRoutes } from "./routes/public.js";
import { adminRoutes } from "./routes/admin.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { cronRoutes } from "./routes/cron.js";

export async function buildApp() {
  const app = Fastify({ logger: { level: config.env === "test" ? "silent" : "info" }, trustProxy: true });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: config.webOrigins,
    methods: ["GET", "POST", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  initializeFirebase();

  await app.register(publicRoutes);
  await app.register(adminRoutes, { prefix: "/admin" });
  await app.register(webhookRoutes, { prefix: "/webhooks" });
  await app.register(cronRoutes, { prefix: "/cron" });

  app.get("/health", async () => ({ status: "ok", version: process.env.APP_VERSION ?? "dev" }));

  app.setErrorHandler((err, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.status(400).send({ error: "Requête invalide", code: "validation", issues: err.validation });
    }
    if (err instanceof DomainError) {
      return reply.status(err.status).send({ error: err.message, code: err.code });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) req.log.error(err);
    const e = err as { message?: string; code?: string };
    return reply.status(status).send({ error: status >= 500 ? "Erreur interne" : (e.message ?? "Erreur"), code: e.code ?? "error" });
  });

  return app;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop()!);
if (isMain) {
  const app = await buildApp();
  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(
      { email: config.email.consoleMode ? "console" : "resend", whatsapp: config.whatsapp.consoleMode ? "console" : "meta" },
      `API La Casbah sur ${config.host}:${config.port}`,
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
