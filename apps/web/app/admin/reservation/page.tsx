"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FORFAITS, STATUS_LABELS_FR, type NotificationLog, type Reservation } from "@casbah/shared";
import { adminApi } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { StatusBadge, dateLabel } from "@/components/admin/ReservationRow";
import { useToast } from "@/components/admin/AdminShell";

const EVENT_LABEL: Record<NotificationLog["event"], string> = {
  "reservation.received": "Demande reçue",
  "reservation.confirmed": "Confirmation",
  "reservation.declined": "Refus",
  "reservation.cancelled": "Annulation",
  "reservation.reminder": "Rappel J-1",
};
const NOTIF_STATUS: Record<NotificationLog["status"], string> = { queued: "en file", sent: "envoyé", delivered: "reçu", read: "lu", failed: "échec", skipped: "ignoré" };

function fmt(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Detail() {
  const id = useSearchParams().get("id") ?? "";
  const toast = useToast();
  const [data, setData] = useState<{ reservation: Reservation; notifications: NotificationLog[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    adminApi
      .get(id)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Chargement impossible."));
  }, [id]);
  useEffect(load, [load]);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast(msg);
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  };
  const ask = (label: string) => {
    const v = window.prompt(label, "");
    return v === null ? null : v.trim() || undefined;
  };

  if (error) return <div className="r-error">{error}</div>;
  if (!data) return <p className="muted">Chargement…</p>;
  const r = data.reservation;
  const l = dateLabel(r.date);

  return (
    <>
      <p>
        <Link href="/admin" className="muted">
          ← Retour à la pile
        </Link>
      </p>
      <h1>
        {r.customer.name} <em>· {l.dow} {l.day} {l.month}, {r.hour}h00</em>
      </h1>
      <div className="adm-grid">
        <div className="adm-card">
          <h2>RÉSERVATION</h2>
          <div className="adm-kv">
            <span>Statut</span>
            <b>
              <StatusBadge status={r.status} />
            </b>
            <span>Rituel</span>
            <b>{FORFAITS[r.forfait].nom}</b>
            <span>Espace</span>
            <b>{r.espace === "femmes" ? "Femmes" : "Hommes"}</b>
            <span>Personnes</span>
            <b>{r.persons}</b>
            <span>Total / acompte</span>
            <b>
              {r.priceTotal} € / {r.depositDue} € sur place
            </b>
            <span>Téléphone</span>
            <b>
              <a href={`tel:${r.customer.phone}`}>{r.customer.phone}</a>
              {r.customer.whatsappOptIn && (
                <>
                  {" · "}
                  <a href={`https://wa.me/${r.customer.phone.replace("+", "")}`} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </>
              )}
            </b>
            <span>E-mail</span>
            <b>{r.customer.email ?? "—"}</b>
            <span>Langue</span>
            <b>{r.customer.locale.toUpperCase()}</b>
            <span>Note</span>
            <b>{r.notes ?? "—"}</b>
            <span>Demande reçue</span>
            <b>{fmt(r.createdAt)}</b>
          </div>
          <div className="acts" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {r.status === "pending" && (
              <>
                <button className="btn sm" type="button" disabled={busy} onClick={() => act(() => adminApi.confirm(r.id), "Confirmée, client prévenu.")}>
                  <span>CONFIRMER</span>
                </button>
                <button
                  className="btn sm danger"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const reason = ask("Motif du refus (facultatif, transmis au client) :");
                    if (reason !== null) act(() => adminApi.decline(r.id, reason), "Refusée, client prévenu.");
                  }}
                >
                  <span>REFUSER</span>
                </button>
              </>
            )}
            {r.status === "confirmed" && (
              <>
                <button
                  className="btn sm danger"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const reason = ask("Motif de l'annulation (facultatif) :");
                    if (reason !== null && window.confirm("Annuler cette réservation et prévenir le client ?")) act(() => adminApi.cancel(r.id, reason), "Annulée, client prévenu.");
                  }}
                >
                  <span>ANNULER</span>
                </button>
                <button className="btn sm ghost" type="button" disabled={busy} onClick={() => window.confirm("Marquer comme non venue ?") && act(() => adminApi.noShow(r.id), "Marquée non venue.")}>
                  <span>NON VENUE</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="adm-card">
          <h2>NOTIFICATIONS</h2>
          <div className="adm-log">
            {data.notifications.length === 0 && <span className="muted">Aucun envoi.</span>}
            {data.notifications.map((n) => (
              <div className="item" key={n.id}>
                <div>
                  {EVENT_LABEL[n.event]} · {n.channel === "whatsapp" ? "WhatsApp" : "E-mail"} · {n.audience === "merchant" ? "vous" : "client"}
                  <small>
                    {n.to} · {fmt(n.updatedAt)}
                    {n.error && <span className="err"> · {n.error}</span>}
                  </small>
                </div>
                <span className={"badge " + n.status}>{NOTIF_STATUS[n.status]}</span>
              </div>
            ))}
          </div>

          <h2 style={{ marginTop: 10 }}>HISTORIQUE</h2>
          <div className="adm-log">
            {r.history.map((h, i) => (
              <div className="item" key={i}>
                <div>
                  {STATUS_LABELS_FR[h.to]}
                  <small>
                    {fmt(h.at)} · {h.by === "customer" ? "client" : h.by === "system" ? "automatique" : "vous"}
                    {h.reason ? ` · ${h.reason}` : ""}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Detail />
    </Suspense>
  );
}
