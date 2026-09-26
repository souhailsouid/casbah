import { createHmac, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { config } from "../../config.js";
import { ReservationEmail } from "../../emails/reservation-email.js";
import type { Message } from "./templates.js";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(config.email.apiKey);
  return _resend;
}

export async function sendEmail(params: {
  to: string;
  message: Message["email"];
  locale: "fr" | "en" | "ar";
  attachments?: { filename: string; content: string }[];
}): Promise<{ id: string }> {
  const html = await render(ReservationEmail({ ...params.message, locale: params.locale }));
  if (config.email.consoleMode) {
    console.log(JSON.stringify({ level: "info", service: "email", mode: "console", to: params.to, subject: params.message.subject }));
    return { id: `console-email-${Date.now()}` };
  }
  const result = await getResend().emails.send({
    from: config.email.from,
    to: params.to,
    subject: params.message.subject,
    html,
    attachments: params.attachments,
  });
  if (result.error || !result.data) throw new Error(`Resend: ${result.error?.message ?? "réponse inattendue"}`);
  return { id: result.data.id };
}

/**
 * Vérifie une signature de webhook Resend (format Svix) :
 * signature = base64(HMAC-SHA256(secret, `${id}.${timestamp}.${body}`)), secret = base64 après « whsec_ ».
 */
export function verifyResendSignature(
  rawBody: string,
  headers: { id?: string; timestamp?: string; signature?: string },
  secret = config.email.webhookSecret,
  now = Date.now(),
): boolean {
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false;
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 5 * 60) return false; // anti-rejeu 5 min
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${headers.id}.${headers.timestamp}.${rawBody}`).digest("base64");
  return headers.signature.split(" ").some((part) => {
    const [, sig] = part.split(",");
    if (!sig) return false;
    const a = Buffer.from(sig, "base64");
    const b = Buffer.from(expected, "base64");
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

/** Fichier .ics pour la confirmation (fuseau Europe/Paris en heure flottante, suffisant pour un agenda). */
export function buildIcs(params: { uid: string; date: string; hour: number; durationMin: number; title: string; location: string; description: string }): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const [y, m, d] = params.date.split("-").map(Number) as [number, number, number];
  const start = `${y}${pad(m)}${pad(d)}T${pad(params.hour)}0000`;
  const endH = params.hour + Math.floor(params.durationMin / 60);
  const endM = params.durationMin % 60;
  const end = `${y}${pad(m)}${pad(d)}T${pad(endH)}${pad(endM)}00`;
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//La Casbah//Réservation//FR",
    "BEGIN:VEVENT",
    `UID:${params.uid}@lacasbah`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=Europe/Paris:${start}`,
    `DTEND;TZID=Europe/Paris:${end}`,
    `SUMMARY:${esc(params.title)}`,
    `LOCATION:${esc(params.location)}`,
    `DESCRIPTION:${esc(params.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
