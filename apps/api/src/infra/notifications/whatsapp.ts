import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../../config.js";

/**
 * WhatsApp Cloud API (Meta) — aucun SDK, appels HTTP directs.
 * Hors fenêtre de 24 h, seuls des templates approuvés peuvent être envoyés : on n'envoie que des templates.
 * Mode console quand WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID sont absents.
 */
export async function sendWhatsappTemplate(params: {
  to: string; // E.164
  template: string;
  language: string;
  bodyParams: string[];
}): Promise<{ id: string }> {
  if (config.whatsapp.consoleMode) {
    console.log(JSON.stringify({ level: "info", service: "whatsapp", mode: "console", ...params }));
    return { id: `console-wa-${Date.now()}` };
  }
  const url = `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    to: params.to.replace(/^\+/, ""),
    type: "template",
    template: {
      name: params.template,
      language: { code: params.language },
      components: params.bodyParams.length
        ? [{ type: "body", parameters: params.bodyParams.map((text) => ({ type: "text", text })) }]
        : [],
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.whatsapp.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message: string; code: number } };
  if (!res.ok || !json.messages?.[0]) {
    throw new Error(`WhatsApp ${res.status}: ${json.error?.message ?? "réponse inattendue"}`);
  }
  return { id: json.messages[0].id };
}

/** Vérifie la signature `X-Hub-Signature-256: sha256=<hmac>` d'un webhook Meta sur le corps brut. */
export function verifyMetaSignature(rawBody: string, header: string | undefined, appSecret = config.whatsapp.appSecret): boolean {
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const given = header.slice(7);
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex"));
}

export type WaStatus = "sent" | "delivered" | "read" | "failed";

/** Extrait les changements de statut d'un payload de webhook WhatsApp. */
export function extractStatuses(payload: unknown): { id: string; status: WaStatus; error?: string }[] {
  const out: { id: string; status: WaStatus; error?: string }[] = [];
  const entries = (payload as { entry?: { changes?: { value?: { statuses?: { id: string; status: string; errors?: { title?: string; message?: string }[] }[] } }[] }[] })?.entry ?? [];
  for (const e of entries) {
    for (const c of e.changes ?? []) {
      for (const s of c.value?.statuses ?? []) {
        if (s.status === "sent" || s.status === "delivered" || s.status === "read" || s.status === "failed") {
          out.push({ id: s.id, status: s.status, error: s.errors?.[0]?.message ?? s.errors?.[0]?.title });
        }
      }
    }
  }
  return out;
}

/** Messages entrants (réponses du client), journalisés en V1. */
export function extractInbound(payload: unknown): { from: string; text: string; id: string }[] {
  const out: { from: string; text: string; id: string }[] = [];
  const entries = (payload as { entry?: { changes?: { value?: { messages?: { id: string; from: string; type: string; text?: { body: string } }[] } }[] }[] })?.entry ?? [];
  for (const e of entries) {
    for (const c of e.changes ?? []) {
      for (const m of c.value?.messages ?? []) {
        if (m.type === "text" && m.text) out.push({ id: m.id, from: "+" + m.from, text: m.text.body });
      }
    }
  }
  return out;
}
