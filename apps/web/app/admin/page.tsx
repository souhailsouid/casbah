"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { COLLECTIONS, RESTAURANT_ID, type Reservation } from "@casbah/shared";
import { getFirebaseDb } from "@/lib/firebase-client";
import { adminApi } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import ReservationRow from "@/components/admin/ReservationRow";
import { useToast } from "@/components/admin/AdminShell";

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Pile : demandes en attente + agenda à venir, en temps réel (Firestore onSnapshot). */
export default function InboxPage() {
  const toast = useToast();
  const [pending, setPending] = useState<Reservation[] | null>(null);
  const [upcoming, setUpcoming] = useState<Reservation[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const col = collection(getFirebaseDb(), COLLECTIONS.reservations(RESTAURANT_ID));
    const toItems = (snap: { docs: { id: string; data: () => unknown }[] }) => snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Reservation, "id">) }));
    const u1 = onSnapshot(
      query(col, where("status", "==", "pending"), orderBy("date"), orderBy("hour")),
      (s) => setPending(toItems(s)),
      (e) => setError("Temps réel indisponible : " + e.message),
    );
    const u2 = onSnapshot(
      query(col, where("status", "==", "confirmed"), where("date", ">=", todayLocal()), orderBy("date"), orderBy("hour")),
      (s) => setUpcoming(toItems(s)),
      (e) => setError("Temps réel indisponible : " + e.message),
    );
    return () => {
      u1();
      u2();
    };
  }, []);

  const act = async (r: Reservation, action: "confirm" | "decline") => {
    let reason: string | undefined;
    if (action === "decline") {
      const v = window.prompt("Motif du refus (facultatif, transmis au client) :", "");
      if (v === null) return;
      reason = v.trim() || undefined;
    }
    setBusyId(r.id);
    try {
      if (action === "confirm") await adminApi.confirm(r.id);
      else await adminApi.decline(r.id, reason);
      toast(action === "confirm" ? "Réservation confirmée, client prévenu." : "Demande refusée, client prévenu.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Action impossible.");
    } finally {
      setBusyId(null);
    }
  };

  const today = todayLocal();
  const todayItems = upcoming?.filter((r) => r.date === today) ?? [];
  const laterItems = upcoming?.filter((r) => r.date > today) ?? [];

  return (
    <>
      <h1>
        La <em>pile</em>.
      </h1>
      {error && <div className="r-error">{error}</div>}

      <section>
        <h2>À TRAITER {pending ? `(${pending.length})` : ""}</h2>
        <div className="adm-list">
          {pending === null ? (
            <div className="adm-empty">Chargement…</div>
          ) : pending.length === 0 ? (
            <div className="adm-empty">Aucune demande en attente. Tout est à jour.</div>
          ) : (
            pending.map((r) => <ReservationRow key={r.id} r={r} busy={busyId === r.id} onConfirm={(x) => act(x, "confirm")} onDecline={(x) => act(x, "decline")} />)
          )}
        </div>
      </section>

      <section>
        <h2>AUJOURD'HUI {upcoming ? `(${todayItems.length})` : ""}</h2>
        <div className="adm-list">
          {todayItems.length === 0 ? <div className="adm-empty">Rien de confirmé pour aujourd'hui.</div> : todayItems.map((r) => <ReservationRow key={r.id} r={r} />)}
        </div>
      </section>

      <section>
        <h2>À VENIR {upcoming ? `(${laterItems.length})` : ""}</h2>
        <div className="adm-list">
          {laterItems.length === 0 ? <div className="adm-empty">Aucune réservation confirmée à venir.</div> : laterItems.map((r) => <ReservationRow key={r.id} r={r} />)}
        </div>
      </section>
    </>
  );
}
