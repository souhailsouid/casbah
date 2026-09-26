"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AvailabilityDay } from "@casbah/shared";
import { normalizePhone } from "@casbah/shared";
import { useI18n } from "@/lib/i18n";
import { useSite } from "@/lib/site-context";
import { ACOMPTE_PAR_PERSONNE, FORFAITS, type ForfaitId } from "@/data/site";
import { euros } from "@/lib/format";
import { ApiError, createReservation, fetchAvailability, isApiConfigured } from "@/lib/api";
import Drawer, { Field, Opt, Steps } from "./Drawer";
import { PorteCoche } from "./Icons";

type Espace = "femmes" | "hommes";

/* ---------- mode démo (sans API) : disponibilités simulées, comme la maquette ---------- */
function demoAvailability(espace: Espace): AvailabilityDay[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i + 1);
    const dow = d.getDay();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const hours = espace === "femmes" ? (dow === 2 ? [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] : [9, 10, 11, 12, 13]) : dow === 2 ? [] : [15, 16, 17, 18, 19, 20];
    const slots = hours.map((h) => {
      let x = (d.getDate() * 7 + dow * 13 + h * 31) % 97;
      if ((dow === 0 || dow === 6) && x < 60) x += 30;
      const affluence = (x < 34 ? 0 : x < 67 ? 1 : 2) as 0 | 1 | 2;
      return { hour: h, remaining: 12 - affluence * 4, affluence };
    });
    return { date, closed: hours.length === 0, slots };
  });
}

function parseDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export default function ResaDrawer() {
  const { t, b, lang } = useI18n();
  const { open, closeDrawer, forfait: preset } = useSite();
  const isOpen = open === "resa";
  const live = isApiConfigured();

  const [step, setStep] = useState(0);
  const [forfait, setForfait] = useState<ForfaitId | null>(null);
  const [espace, setEspace] = useState<Espace | null>(null);
  const [pers, setPers] = useState(2);
  const [days, setDays] = useState<AvailabilityDay[]>([]);
  const [loadingDays, setLoadingDays] = useState(false);
  const [day, setDay] = useState<number | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const idemKey = useRef<string>("");

  useEffect(() => {
    if (isOpen && preset) setForfait(preset);
  }, [isOpen, preset]);

  // Disponibilités : API réelle si configurée, sinon simulation.
  useEffect(() => {
    if (!espace) return;
    let cancelled = false;
    if (!live) {
      setDays(demoAvailability(espace));
      return;
    }
    setLoadingDays(true);
    fetchAvailability(espace)
      .then((res) => !cancelled && setDays(res.days))
      .catch(() => !cancelled && setDays(demoAvailability(espace)))
      .finally(() => !cancelled && setLoadingDays(false));
    return () => {
      cancelled = true;
    };
  }, [espace, live]);

  const f = FORFAITS.find((x) => x.id === forfait);
  const depot = ACOMPTE_PAR_PERSONNE * pers;
  const total = (f?.prix ?? 0) * pers;
  const d = day !== null ? days[day] : null;
  const dDate = useMemo(() => (d ? parseDate(d.date) : null), [d]);
  const phoneOk = normalizePhone(tel) !== null;

  const ok =
    step === 0 ? !!forfait
    : step === 1 ? !!espace
    : step === 2 ? day !== null && slot !== null
    : nom.trim().length > 1 && phoneOk;

  const reset = () => {
    setStep(0);
    setForfait(null);
    setEspace(null);
    setPers(2);
    setDay(null);
    setSlot(null);
    setNom("");
    setTel("");
    setEmail("");
    setOptIn(true);
    setError(null);
    setDone(false);
    idemKey.current = "";
  };
  const close = () => {
    closeDrawer();
    if (done) reset();
  };

  const submit = async () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    setError(null);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!live) {
      setTimeout(() => {
        setBusy(false);
        setDone(true);
      }, reduced ? 50 : 1000);
      return;
    }
    try {
      if (!idemKey.current) idemKey.current = crypto.randomUUID();
      const phone = normalizePhone(tel);
      if (!phone || !f || !espace || !d || slot === null) throw new Error("state");
      await createReservation({
        forfait: f.id,
        espace,
        persons: pers,
        date: d.date,
        hour: slot,
        customer: { name: nom.trim(), phone, email: email.trim() || undefined, whatsappOptIn: optIn, locale: lang },
        idempotencyKey: idemKey.current,
      });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "full") setError(b.errFull);
        else if (err.code === "duplicate") setError(b.errDuplicate);
        else if (err.status === 429) setError(b.errGeneric);
        else setError(err.message || b.errGeneric);
        if (err.code === "full" || err.code === "too_soon" || err.code === "closed") {
          idemKey.current = "";
          setStep(2);
          setSlot(null);
          if (espace) fetchAvailability(espace).then((res) => setDays(res.days)).catch(() => {});
        }
      } else {
        setError(b.errGeneric);
      }
    } finally {
      setBusy(false);
    }
  };

  const doneTxt = f && dDate && slot !== null ? b.resaSent(f.nom, b.jours[dDate.getDay()]!, dDate.getDate(), b.mois[dDate.getMonth()]!, slot, optIn, !!email.trim()) : "";

  return (
    <Drawer
      id="resa"
      open={isOpen}
      onClose={close}
      label={t("RÉSERVER")}
      titre={t("RÉSERVER")}
      head={<Steps n={4} current={step} />}
      foot={
        !done && (
          <div className="r-foot">
            <button className="btn ghost" type="button" onClick={() => step > 0 && setStep(step - 1)} style={{ visibility: step === 0 ? "hidden" : "visible" }}>
              <span>{t("RETOUR")}</span>
            </button>
            <button className={"btn" + (ok ? "" : " off") + (busy ? " busy" : "")} id="r-next" type="button" onClick={submit}>
              <span>{busy ? b.envoiEnCours : step === 3 ? b.envoyer : b.continuer}</span>
            </button>
          </div>
        )
      }
    >
      {done ? (
        <div className="r-done on">
          <PorteCoche />
          <div className="t">
            {t("Demande ")}
            <em>{t("envoyée")}</em>.
          </div>
          <p>{doneTxt}</p>
          {!live && <p className="r-hint">{t("Démo — aucune réservation réelle n'est envoyée.")}</p>}
        </div>
      ) : (
        <>
          {step === 0 && (
            <div className="rstep on">
              <div className="r-q">
                {t("Quel ")}
                <em>{t("rituel")}</em>&nbsp;?
              </div>
              <div className="r-opts">
                {FORFAITS.map((x, i) => (
                  <Opt key={x.id} sel={forfait === x.id} onClick={() => setForfait(x.id)} nom={x.nom} d={b.forfaitsD[i]} p={euros(x.prix)} />
                ))}
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="rstep on">
              <div className="r-q">
                {t("Quel ")}
                <em>{t("espace")}</em>
                {t(", pour combien ?")}
              </div>
              <div className="r-opts">
                {(["femmes", "hommes"] as Espace[]).map((e, i) => (
                  <Opt
                    key={e}
                    sel={espace === e}
                    onClick={() => {
                      if (espace !== e) {
                        setDay(null);
                        setSlot(null);
                      }
                      setEspace(e);
                    }}
                    nom={b.espaces[i].nom}
                    d={b.espaces[i].d}
                  />
                ))}
              </div>
              <div className="r-count">
                <button type="button" aria-label="Moins de personnes" onClick={() => setPers(Math.max(1, pers - 1))}>
                  −
                </button>
                <b>{pers}</b>
                <button type="button" aria-label="Plus de personnes" onClick={() => setPers(Math.min(7, pers + 1))}>
                  +
                </button>
                <span className="r-hint">{t("personne(s) — à partir de 8, passez par l'offre Groupes")}</span>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="rstep on">
              <div className="r-q">
                {t("Quel ")}
                <em>{t("moment")}</em>&nbsp;?
              </div>
              <div className="r-days" aria-busy={loadingDays}>
                {days.map((o, i) => {
                  const od = parseDate(o.date);
                  const off = o.closed || o.slots.length === 0;
                  return (
                    <button
                      key={o.date}
                      type="button"
                      className={"r-day" + (day === i ? " sel" : "") + (off ? " off" : "")}
                      disabled={off}
                      onClick={() => {
                        setDay(i);
                        setSlot(null);
                      }}
                    >
                      <small>{b.jours[od.getDay()]!.toUpperCase()}</small>
                      <b>{od.getDate()}</b>
                      <span>{off ? "—" : b.mois[od.getMonth()]}</span>
                    </button>
                  );
                })}
              </div>
              <div className="r-slots">
                {d?.slots.map((s) => {
                  const full = s.remaining < pers;
                  return (
                    <button
                      key={s.hour}
                      type="button"
                      className={"r-slot" + (slot === s.hour ? " sel" : "") + (s.affluence === 2 ? " charge" : "") + (full ? " off" : "")}
                      disabled={full}
                      onClick={() => setSlot(s.hour)}
                    >
                      <b>{s.hour}h00</b>
                      <span className="aff">
                        {[0, 1, 2].map((k) => (
                          <i key={k} className={k <= s.affluence ? "f" : ""} />
                        ))}
                      </span>
                      <small>{full ? b.slotFull : b.aff[s.affluence].toUpperCase()}</small>
                    </button>
                  );
                })}
              </div>
              <div className="r-hint">{day === null ? b.hintJour : b.hintAff}</div>
              {error && <div className="r-error">{error}</div>}
            </div>
          )}
          {step === 3 && f && d && dDate && (
            <div className="rstep on">
              <div className="r-q">
                {t("Et pour ")}
                <em>{t("finir")}</em>.
              </div>
              <Field id="r-nom" label={t("VOTRE NOM")} placeholder={t("Prénom Nom")} value={nom} onChange={setNom} autoComplete="name" />
              <Field id="r-tel" label={t("TÉLÉPHONE")} placeholder="06 12 34 56 78" type="tel" value={tel} onChange={setTel} autoComplete="tel" />
              {tel.trim().length > 5 && !phoneOk && <div className="r-error">{b.errPhone}</div>}
              <label className="r-check">
                <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
                <span>{b.optIn}</span>
              </label>
              <Field id="r-email" label={b.emailLabel} placeholder="prenom@email.fr" type="email" value={email} onChange={setEmail} autoComplete="email" />
              <div className="r-recap">
                <div className="row">
                  <span>{b.recap.rituel}</span>
                  <b>{f.nom}</b>
                </div>
                <div className="row">
                  <span>{b.recap.espace}</span>
                  <b>{espace === "femmes" ? b.recap.femmes : b.recap.hommes}</b>
                </div>
                <div className="row">
                  <span>{b.recap.date}</span>
                  <b>
                    {b.jours[dDate.getDay()]} {dDate.getDate()} {b.mois[dDate.getMonth()]} · {slot}h00
                  </b>
                </div>
                <div className="row">
                  <span>{b.recap.personnes}</span>
                  <b>{pers}</b>
                </div>
                <div className="tot">
                  <span>{b.recap.total}</span>
                  <b>{euros(total)}</b>
                </div>
              </div>
              <div className="r-hint">{b.depositNote(depot)}</div>
              {error && <div className="r-error">{error}</div>}
              {!live && <div className="r-hint">{t("Démo — aucune réservation réelle n'est envoyée.")}</div>}
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}
