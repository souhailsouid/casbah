"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError, cancelReservation, getCancelInfo, type CancelInfo } from "@/lib/api";
import { PorteCoche } from "@/components/Icons";

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function label(date: string, hour: number) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  return `${JOURS[dt.getDay()]} ${d} ${MOIS[m - 1]} à ${hour}h00`;
}

function Annulation() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const token = params.get("token") ?? "";
  const [info, setInfo] = useState<CancelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id || !token) {
      setError("Lien incomplet.");
      return;
    }
    getCancelInfo(id, token)
      .then(setInfo)
      .catch((e: unknown) => setError(e instanceof ApiError && e.status === 404 ? "Ce lien d'annulation n'est plus valide." : "Impossible de charger la réservation."));
  }, [id, token]);

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await cancelReservation(id, token);
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Annulation impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="simple">
      <div className="card">
        <span className="brand-line">LA CASBAH · HAMMAM · SPA · RESTAURANT</span>
        {done ? (
          <>
            <PorteCoche />
            <h1>
              Réservation <em>annulée</em>.
            </h1>
            <p>Merci de nous avoir prévenus. À bientôt à La Casbah.</p>
            <a className="btn" href="../#bains">
              <span>RÉSERVER UN AUTRE CRÉNEAU</span>
            </a>
          </>
        ) : info ? (
          <>
            <h1>
              Annuler votre <em>réservation</em>&nbsp;?
            </h1>
            <div className="r-recap">
              <div className="row">
                <span>Nom</span>
                <b>{info.name}</b>
              </div>
              <div className="row">
                <span>Rituel</span>
                <b>{info.forfait}</b>
              </div>
              <div className="row">
                <span>Date</span>
                <b>{label(info.date, info.hour)}</b>
              </div>
              <div className="row">
                <span>Personnes</span>
                <b>{info.persons}</b>
              </div>
            </div>
            {info.canCancel ? (
              <>
                <p className="r-hint">Annulation gratuite jusqu'à {info.cancelDeadlineHours} h avant le créneau. Passé ce délai, appelez-nous.</p>
                <button className={"btn" + (busy ? " busy" : "")} type="button" onClick={cancel} disabled={busy}>
                  <span>{busy ? "ANNULATION…" : "CONFIRMER L'ANNULATION"}</span>
                </button>
              </>
            ) : (
              <p className="r-hint">Cette réservation n'est plus active ({info.status}).</p>
            )}
            {error && <div className="r-error">{error}</div>}
          </>
        ) : (
          <>
            <h1>Votre réservation</h1>
            {error ? <div className="r-error">{error}</div> : <p className="r-hint">Chargement…</p>}
          </>
        )}
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Annulation />
    </Suspense>
  );
}
