import type { Affluence, AvailabilityDay, Espace, RestaurantSettings, SlotCounter } from "./types.js";

/** YYYY-MM-DD → jour de la semaine (0 = dimanche), sans dépendre du fuseau de la machine. */
export function dayOfWeek(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** Date du jour (YYYY-MM-DD) dans un fuseau donné. */
export function todayIn(timezone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return parts; // en-CA donne déjà YYYY-MM-DD
}

/** Heure courante (décimale) dans un fuseau donné. */
export function hourNowIn(timezone: string, now: Date = new Date()): number {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false });
  const [h, m] = f.format(now).split(":").map(Number) as [number, number];
  return h + m / 60;
}

export function isClosedDay(settings: RestaurantSettings, espace: Espace, date: string): boolean {
  if (settings.closedDates.includes(date)) return true;
  const dow = dayOfWeek(date);
  return (settings.hours[espace].closedDays ?? []).includes(dow);
}

/** Heures (entières) ouvertes à la réservation pour un espace et une date. */
export function openingHours(settings: RestaurantSettings, espace: Espace, date: string): number[] {
  if (isClosedDay(settings, espace, date)) return [];
  const dow = dayOfWeek(date) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const range = settings.hours[espace].byDay[dow] ?? settings.hours[espace].default;
  const [start, last] = range;
  const out: number[] = [];
  for (let h = Math.ceil(start); h <= Math.floor(last); h++) out.push(h);
  return out;
}

export function affluenceOf(count: number, capacity: number): Affluence {
  if (capacity <= 0) return 2;
  const r = count / capacity;
  return r < 0.34 ? 0 : r < 0.67 ? 1 : 2;
}

/**
 * Disponibilités sur N jours à partir de `from` (exclu le jour même si l'heure est passée).
 * `counters` : compteurs Firestore indexés par date.
 */
export function buildAvailability(params: {
  settings: RestaurantSettings;
  espace: Espace;
  from: string;
  days: number;
  counters: Record<string, SlotCounter | undefined>;
  now?: Date;
}): AvailabilityDay[] {
  const { settings, espace, from, days, counters } = params;
  const now = params.now ?? new Date();
  const today = todayIn(settings.timezone, now);
  const nowHour = hourNowIn(settings.timezone, now);
  const capacity = settings.capacityPerSlot[espace];
  const out: AvailabilityDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const hours = openingHours(settings, espace, date);
    const counts = counters[date]?.counts ?? {};
    const slots = hours
      .filter((h) => !(date === today && h <= nowHour + 1)) // au moins 1 h d'avance
      .map((h) => {
        const used = counts[String(h)] ?? 0;
        return { hour: h, remaining: Math.max(0, capacity - used), affluence: affluenceOf(used, capacity) };
      });
    out.push({ date, closed: hours.length === 0, slots });
  }
  return out;
}

/** Vérifie qu'une demande vise un créneau réservable (horizon, horaires, avance minimale). */
export function validateSlot(params: {
  settings: RestaurantSettings;
  espace: Espace;
  date: string;
  hour: number;
  now?: Date;
}): { ok: true } | { ok: false; reason: string } {
  const { settings, espace, date, hour } = params;
  const now = params.now ?? new Date();
  const today = todayIn(settings.timezone, now);
  if (date < today) return { ok: false, reason: "date_past" };
  if (date > addDays(today, settings.bookingHorizonDays)) return { ok: false, reason: "date_too_far" };
  if (!openingHours(settings, espace, date).includes(hour)) return { ok: false, reason: "closed" };
  if (date === today && hour <= hourNowIn(settings.timezone, now) + 1) return { ok: false, reason: "too_soon" };
  return { ok: true };
}
