"use client";

import { useEffect, useState } from "react";
import type { Reservation, ReservationStatus } from "@casbah/shared";
import { STATUS_LABELS_FR } from "@casbah/shared";
import { adminApi } from "@/lib/admin-api";
import ReservationRow from "@/components/admin/ReservationRow";

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Historique et recherche par période / statut (lecture API, pas de temps réel). */
export default function ListePage() {
  const [status, setStatus] = useState<ReservationStatus | "">("");
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 14 * 86400000)));
  const [to, setTo] = useState(() => iso(new Date(Date.now() + 30 * 86400000)));
  const [items, setItems] = useState<Reservation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams({ from, to, limit: "200" });
    if (status) q.set("status", status);
    setItems(null);
    adminApi
      .list(q.toString())
      .then((r) => setItems(r.items))
      .catch((e: Error) => setError(e.message));
  }, [status, from, to]);

  return (
    <>
      <h1>
        L'<em>historique</em>.
      </h1>
      <div className="adm-filters">
        <select value={status} onChange={(e) => setStatus(e.target.value as ReservationStatus | "")}>
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUS_LABELS_FR) as ReservationStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS_FR[s]}
            </option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="muted">→</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <span className="muted">{items ? `${items.length} réservation(s)` : ""}</span>
      </div>
      {error && <div className="r-error">{error}</div>}
      <div className="adm-list">
        {items === null ? <div className="adm-empty">Chargement…</div> : items.length === 0 ? <div className="adm-empty">Rien sur cette période.</div> : items.map((r) => <ReservationRow key={r.id} r={r} />)}
      </div>
    </>
  );
}
