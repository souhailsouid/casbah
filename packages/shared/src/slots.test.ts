import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./constants.js";
import { addDays, buildAvailability, dayOfWeek, openingHours, validateSlot } from "./slots.js";
import { canTransition } from "./reservation-state.js";
import { normalizePhone } from "./schemas.js";

describe("horaires", () => {
  it("connaît le jour de la semaine sans fuseau", () => {
    expect(dayOfWeek("2026-09-29")).toBe(2); // mardi
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  });
  it("femmes : mardi 10h–20h, sinon 9h–13h", () => {
    expect(openingHours(DEFAULT_SETTINGS, "femmes", "2026-09-29")).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(openingHours(DEFAULT_SETTINGS, "femmes", "2026-09-30")).toEqual([9, 10, 11, 12, 13]);
  });
  it("hommes : fermé le mardi", () => {
    expect(openingHours(DEFAULT_SETTINGS, "hommes", "2026-09-29")).toEqual([]);
    expect(openingHours(DEFAULT_SETTINGS, "hommes", "2026-09-30")).toEqual([15, 16, 17, 18, 19, 20]);
  });
  it("fermeture exceptionnelle", () => {
    const s = { ...DEFAULT_SETTINGS, closedDates: ["2026-12-25"] };
    expect(openingHours(s, "femmes", "2026-12-25")).toEqual([]);
  });
});

describe("disponibilités", () => {
  const now = new Date("2026-09-28T10:00:00+02:00"); // lundi 10h Paris
  it("masque les créneaux trop proches le jour même et calcule l'affluence", () => {
    const days = buildAvailability({
      settings: DEFAULT_SETTINGS,
      espace: "hommes",
      from: "2026-09-28",
      days: 2,
      counters: { "2026-09-28": { date: "2026-09-28", espace: "hommes", counts: { "15": 9 }, updatedAt: "" } },
      now,
    });
    expect(days[0]!.slots.map((s) => s.hour)).toEqual([15, 16, 17, 18, 19, 20]);
    expect(days[0]!.slots[0]).toEqual({ hour: 15, remaining: 3, affluence: 2 });
    expect(days[1]!.closed).toBe(true); // mardi
  });
  it("refuse le passé, le trop lointain et les heures fermées", () => {
    expect(validateSlot({ settings: DEFAULT_SETTINGS, espace: "hommes", date: "2026-09-27", hour: 15, now })).toEqual({ ok: false, reason: "date_past" });
    expect(validateSlot({ settings: DEFAULT_SETTINGS, espace: "hommes", date: "2026-11-30", hour: 15, now })).toEqual({ ok: false, reason: "date_too_far" });
    expect(validateSlot({ settings: DEFAULT_SETTINGS, espace: "hommes", date: "2026-09-29", hour: 15, now })).toEqual({ ok: false, reason: "closed" });
    expect(validateSlot({ settings: DEFAULT_SETTINGS, espace: "femmes", date: "2026-09-28", hour: 11, now })).toEqual({ ok: false, reason: "too_soon" });
    expect(validateSlot({ settings: DEFAULT_SETTINGS, espace: "femmes", date: "2026-09-28", hour: 12, now })).toEqual({ ok: true });
  });
});

describe("machine à états", () => {
  it("autorise seulement les transitions prévues", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "pending")).toBe(false);
    expect(canTransition("declined", "confirmed")).toBe(false);
  });
});

describe("téléphone", () => {
  it("normalise les formats français", () => {
    expect(normalizePhone("06 12 34 56 78")).toBe("+33612345678");
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("+33612345678");
    expect(normalizePhone("0033612345678")).toBe("+33612345678");
    expect(normalizePhone("12")).toBeNull();
  });
});
