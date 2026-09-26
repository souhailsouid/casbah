import { z } from "zod";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** E.164 : +33612345678 */
const E164_RE = /^\+[1-9]\d{6,14}$/;

export const createReservationSchema = z.object({
  forfait: z.enum(["entree", "rituel", "evasion"]),
  espace: z.enum(["femmes", "hommes"]),
  persons: z.number().int().min(1).max(7),
  date: z.string().regex(DATE_RE),
  hour: z.number().int().min(0).max(23),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().regex(E164_RE, "Téléphone au format international attendu (+33…)"),
    email: z.string().trim().email().max(120).optional(),
    whatsappOptIn: z.boolean().default(false),
    locale: z.enum(["fr", "en", "ar"]).default("fr"),
  }),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().uuid(),
  /** Pot de miel : doit rester vide (rempli par les robots). */
  website: z.string().max(0).optional(),
});
export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const availabilityQuerySchema = z.object({
  espace: z.enum(["femmes", "hommes"]),
  from: z.string().regex(DATE_RE).optional(),
  days: z.coerce.number().int().min(1).max(31).default(12),
});

export const decisionSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const listReservationsQuerySchema = z.object({
  status: z.enum(["pending", "confirmed", "declined", "cancelled", "no_show", "completed"]).optional(),
  from: z.string().regex(DATE_RE).optional(),
  to: z.string().regex(DATE_RE).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const hoursSchema = z.object({
  default: z.tuple([z.number().min(0).max(23.5), z.number().min(0).max(23.5)]),
  byDay: z.record(z.string(), z.tuple([z.number(), z.number()])).default({}),
  closedDays: z.array(z.number().int().min(0).max(6)).optional(),
});

export const settingsSchema = z.object({
  timezone: z.string().default("Europe/Paris"),
  slotMinutes: z.literal(60).default(60),
  bookingHorizonDays: z.number().int().min(1).max(120),
  cancelDeadlineHours: z.number().int().min(0).max(168),
  maxPersonsPerBooking: z.number().int().min(1).max(20),
  capacityPerSlot: z.object({ femmes: z.number().int().min(0).max(200), hommes: z.number().int().min(0).max(200) }),
  hours: z.object({ femmes: hoursSchema, hommes: hoursSchema }),
  closedDates: z.array(z.string().regex(DATE_RE)).default([]),
});

export const restaurantUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().regex(E164_RE).optional(),
  notifyEmail: z.string().trim().email().optional(),
  notifyWhatsapp: z.string().trim().regex(E164_RE).optional().or(z.literal("")),
  settings: settingsSchema.optional(),
});

/** Normalise un numéro saisi en France (« 06 12 34 56 78 ») en E.164. Retourne null si illisible. */
export function normalizePhone(raw: string, defaultCountry: "FR" = "FR"): string | null {
  const digits = raw.replace(/[\s.\-()]/g, "");
  if (E164_RE.test(digits)) return digits;
  if (digits.startsWith("00")) {
    const intl = "+" + digits.slice(2);
    return E164_RE.test(intl) ? intl : null;
  }
  if (defaultCountry === "FR" && /^0[1-9]\d{8}$/.test(digits)) return "+33" + digits.slice(1);
  return null;
}
