"use client";

import { useEffect, useState } from "react";
import type { Espace, Restaurant, RestaurantSettings } from "@casbah/shared";
import { adminApi } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/admin/AdminShell";

const DAYS: { i: 0 | 1 | 2 | 3 | 4 | 5 | 6; l: string }[] = [
  { i: 1, l: "Lundi" },
  { i: 2, l: "Mardi" },
  { i: 3, l: "Mercredi" },
  { i: 4, l: "Jeudi" },
  { i: 5, l: "Vendredi" },
  { i: 6, l: "Samedi" },
  { i: 0, l: "Dimanche" },
];

/** Horaires, capacités, fermetures, coordonnées de notification. */
export default function ReglagesPage() {
  const toast = useToast();
  const [r, setR] = useState<Restaurant | null>(null);
  const [s, setS] = useState<RestaurantSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi
      .restaurant()
      .then((x) => {
        setR(x);
        setS(x.settings);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="r-error">{error}</div>;
  if (!r || !s) return <p className="muted">Chargement…</p>;

  const hoursFor = (esp: Espace, day: 0 | 1 | 2 | 3 | 4 | 5 | 6): [number, number] | null => {
    if ((s.hours[esp].closedDays ?? []).includes(day)) return null;
    return s.hours[esp].byDay[day] ?? s.hours[esp].default;
  };
  const setHours = (esp: Espace, day: 0 | 1 | 2 | 3 | 4 | 5 | 6, value: [number, number] | null) => {
    const h = { ...s.hours[esp], byDay: { ...s.hours[esp].byDay }, closedDays: [...(s.hours[esp].closedDays ?? [])] };
    if (value === null) {
      if (!h.closedDays.includes(day)) h.closedDays.push(day);
    } else {
      h.closedDays = h.closedDays.filter((d) => d !== day);
      h.byDay[day] = value;
    }
    setS({ ...s, hours: { ...s.hours, [esp]: h } });
  };

  const save = async () => {
    setBusy(true);
    try {
      const updated = await adminApi.updateRestaurant({ name: r.name, phone: r.phone || undefined, notifyEmail: r.notifyEmail, notifyWhatsapp: r.notifyWhatsapp ?? "", settings: s });
      setR(updated);
      setS(updated.settings);
      toast("Réglages enregistrés.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>
        Les <em>réglages</em>.
      </h1>

      <div className="adm-card">
        <h2>ÉTABLISSEMENT & NOTIFICATIONS</h2>
        <div className="adm-form">
          <div className="r-field">
            <label>NOM</label>
            <input value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} />
          </div>
          <div className="r-field">
            <label>E-MAIL DE NOTIFICATION</label>
            <input type="email" value={r.notifyEmail} onChange={(e) => setR({ ...r, notifyEmail: e.target.value })} />
          </div>
          <div className="r-field">
            <label>WHATSAPP MARCHAND (E.164, FACULTATIF)</label>
            <input placeholder="+33612345678" value={r.notifyWhatsapp ?? ""} onChange={(e) => setR({ ...r, notifyWhatsapp: e.target.value })} />
          </div>
          <div className="r-field">
            <label>TÉLÉPHONE AFFICHÉ (E.164)</label>
            <input placeholder="+33160000000" value={r.phone ?? ""} onChange={(e) => setR({ ...r, phone: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="adm-card">
        <h2>RÈGLES DE RÉSERVATION</h2>
        <div className="adm-form">
          <div className="r-field">
            <label>CAPACITÉ PAR CRÉNEAU · FEMMES</label>
            <input type="number" min={0} value={s.capacityPerSlot.femmes} onChange={(e) => setS({ ...s, capacityPerSlot: { ...s.capacityPerSlot, femmes: +e.target.value } })} />
          </div>
          <div className="r-field">
            <label>CAPACITÉ PAR CRÉNEAU · HOMMES</label>
            <input type="number" min={0} value={s.capacityPerSlot.hommes} onChange={(e) => setS({ ...s, capacityPerSlot: { ...s.capacityPerSlot, hommes: +e.target.value } })} />
          </div>
          <div className="r-field">
            <label>PERSONNES MAX. PAR RÉSERVATION</label>
            <input type="number" min={1} max={20} value={s.maxPersonsPerBooking} onChange={(e) => setS({ ...s, maxPersonsPerBooking: +e.target.value })} />
          </div>
          <div className="r-field">
            <label>HORIZON DE RÉSERVATION (JOURS)</label>
            <input type="number" min={1} max={120} value={s.bookingHorizonDays} onChange={(e) => setS({ ...s, bookingHorizonDays: +e.target.value })} />
          </div>
          <div className="r-field">
            <label>ANNULATION GRATUITE JUSQU'À (HEURES AVANT)</label>
            <input type="number" min={0} max={168} value={s.cancelDeadlineHours} onChange={(e) => setS({ ...s, cancelDeadlineHours: +e.target.value })} />
          </div>
          <div className="r-field">
            <label>FERMETURES EXCEPTIONNELLES (AAAA-MM-JJ, VIRGULES)</label>
            <input
              value={s.closedDates.join(", ")}
              onChange={(e) => setS({ ...s, closedDates: e.target.value.split(",").map((x) => x.trim()).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)) })}
            />
          </div>
        </div>
      </div>

      <div className="adm-card">
        <h2>HORAIRES (PREMIER ET DERNIER CRÉNEAU)</h2>
        <div className="adm-hours">
          {(["femmes", "hommes"] as Espace[]).map((esp) => (
            <table key={esp}>
              <thead>
                <tr>
                  <td colSpan={4} style={{ color: "var(--or)", letterSpacing: ".2em", fontSize: 11 }}>
                    {esp.toUpperCase()}
                  </td>
                </tr>
              </thead>
              <tbody>
                {DAYS.map(({ i, l }) => {
                  const h = hoursFor(esp, i);
                  return (
                    <tr key={i}>
                      <td>{l}</td>
                      <td>
                        <input type="checkbox" checked={h !== null} onChange={(e) => setHours(esp, i, e.target.checked ? s.hours[esp].default : null)} /> ouvert
                      </td>
                      <td>{h && <input type="number" min={0} max={23} value={h[0]} onChange={(e) => setHours(esp, i, [+e.target.value, h[1]])} />}</td>
                      <td>{h && <input type="number" min={0} max={23} value={h[1]} onChange={(e) => setHours(esp, i, [h[0], +e.target.value])} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}
        </div>
      </div>

      <div>
        <button className="btn" type="button" disabled={busy} onClick={save}>
          <span>{busy ? "ENREGISTREMENT…" : "ENREGISTRER"}</span>
        </button>
      </div>
    </>
  );
}
