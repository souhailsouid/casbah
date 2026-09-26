/** Configuration lue une fois depuis l'environnement. Les modes « console » remplacent les fournisseurs absents. */

function list(v: string | undefined): string[] {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const webOrigins = list(process.env.WEB_URL);
const webBasePath = (process.env.WEB_BASE_PATH ?? "").replace(/\/$/, "");

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || "0.0.0.0",

  /** Origines autorisées (CORS). */
  webOrigins: webOrigins.length ? webOrigins : ["http://localhost:3000"],
  /** URL publique du site, utilisée dans les messages (liens d'annulation, admin). */
  webUrl: (webOrigins[0] ?? "http://localhost:3000") + webBasePath,

  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "casbah-dev",

  email: {
    apiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? "La Casbah <reservations@example.com>",
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET ?? "",
    get consoleMode() {
      return !this.apiKey;
    },
  },

  whatsapp: {
    token: process.env.WHATSAPP_TOKEN ?? "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    appSecret: process.env.WHATSAPP_APP_SECRET ?? "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
    apiVersion: process.env.WHATSAPP_API_VERSION ?? "v21.0",
    get consoleMode() {
      return !this.token || !this.phoneNumberId;
    },
  },

  cronSecret: process.env.CRON_SECRET ?? "",
  /** Secret des jetons d'annulation (HMAC). En prod : Secret Manager. */
  cancelTokenSecret: process.env.CANCEL_TOKEN_SECRET || process.env.CRON_SECRET || "dev-cancel-secret",
} as const;
