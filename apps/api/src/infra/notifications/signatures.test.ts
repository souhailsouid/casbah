import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { extractStatuses, verifyMetaSignature } from "./whatsapp.js";
import { buildIcs, verifyResendSignature } from "./email.js";

describe("signature Meta", () => {
  const secret = "app-secret";
  const body = JSON.stringify({ entry: [] });
  it("accepte une signature valide et refuse le reste", () => {
    const sig = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyMetaSignature(body, sig, secret)).toBe(true);
    expect(verifyMetaSignature(body + " ", sig, secret)).toBe(false);
    expect(verifyMetaSignature(body, "sha256=00", secret)).toBe(false);
    expect(verifyMetaSignature(body, undefined, secret)).toBe(false);
    expect(verifyMetaSignature(body, sig, "")).toBe(false);
  });
  it("extrait les statuts de livraison", () => {
    const payload = { entry: [{ changes: [{ value: { statuses: [{ id: "wamid.1", status: "delivered" }, { id: "wamid.2", status: "failed", errors: [{ title: "Unsupported" }] }] } }] }] };
    expect(extractStatuses(payload)).toEqual([
      { id: "wamid.1", status: "delivered", error: undefined },
      { id: "wamid.2", status: "failed", error: "Unsupported" },
    ]);
  });
});

describe("signature Resend (Svix)", () => {
  const rawSecret = Buffer.from("0123456789abcdef0123456789abcdef");
  const secret = "whsec_" + rawSecret.toString("base64");
  const body = '{"type":"email.delivered","data":{"email_id":"x"}}';
  const now = 1_700_000_000_000;
  const ts = String(Math.floor(now / 1000));
  const sig = "v1," + createHmac("sha256", rawSecret).update(`msg_1.${ts}.${body}`).digest("base64");
  it("valide et rejette les signatures / horodatages incorrects", () => {
    expect(verifyResendSignature(body, { id: "msg_1", timestamp: ts, signature: sig }, secret, now)).toBe(true);
    expect(verifyResendSignature(body, { id: "msg_2", timestamp: ts, signature: sig }, secret, now)).toBe(false);
    expect(verifyResendSignature(body, { id: "msg_1", timestamp: ts, signature: sig }, secret, now + 10 * 60 * 1000)).toBe(false);
  });
});

describe("ics", () => {
  it("produit un événement d'une durée correcte", () => {
    const ics = buildIcs({ uid: "abc", date: "2026-10-03", hour: 15, durationMin: 150, title: "T", location: "L", description: "D, E" });
    expect(ics).toContain("DTSTART;TZID=Europe/Paris:20261003T150000");
    expect(ics).toContain("DTEND;TZID=Europe/Paris:20261003T173000");
    expect(ics).toContain("DESCRIPTION:D\\, E");
  });
});
