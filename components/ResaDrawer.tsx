"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useSite } from "@/lib/site-context";
import { ACOMPTE_PAR_PERSONNE, FORFAITS, type ForfaitId } from "@/data/site";
import { euros } from "@/lib/format";
import Drawer, { Field, Opt, PayMethods, Steps } from "./Drawer";
import { Cadenas, PorteCoche } from "./Icons";

type Espace = "femmes" | "hommes";

function dayList(espace: Espace | null) {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i + 1);
    return { date: d, closed: espace === "hommes" && d.getDay() === 2 };
  });
}
function hoursFor(espace: Espace | null, d: Date) {
  const dow = d.getDay();
  if (espace === "femmes") return dow === 2 ? [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] : [9, 10, 11, 12, 13];
  return dow === 2 ? [] : [15, 16, 17, 18, 19, 20];
}
/** Affluence simulée (0 calme, 1 modéré, 2 chargé) — déterministe par jour/heure. */
function affOf(d: Date, h: number) {
  let x = (d.getDate() * 7 + d.getDay() * 13 + h * 31) % 97;
  if ((d.getDay() === 0 || d.getDay() === 6) && x < 60) x += 30;
  return x < 34 ? 0 : x < 67 ? 1 : 2;
}

export default function ResaDrawer() {
  const { t, b } = useI18n();
  const { open, closeDrawer, forfait: preset } = useSite();
  const isOpen = open === "resa";

  const [step, setStep] = useState(0);
  const [forfait, setForfait] = useState<ForfaitId | null>(null);
  const [espace, setEspace] = useState<Espace | null>(null);
  const [pers, setPers] = useState(2);
  const [day, setDay] = useState<number | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [pay, setPay] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isOpen && preset) setForfait(preset);
  }, [isOpen, preset]);

  const f = FORFAITS.find((x) => x.id === forfait);
  const depot = ACOMPTE_PAR_PERSONNE * pers;
  const total = (f?.prix ?? 0) * pers;
  const days = useMemo(() => dayList(espace), [espace]);

  const ok =
    step === 0 ? !!forfait
    : step === 1 ? !!espace
    : step === 2 ? day !== null && slot !== null
    : step === 3 ? nom.trim().length > 1 && tel.trim().length > 5
    : !!pay;

  const reset = () => {
    setStep(0);
    setForfait(null);
    setEspace(null);
    setPers(2);
    setDay(null);
    setSlot(null);
    setPay(null);
    setNom("");
    setTel("");
    setDone(false);
  };
  const close = () => {
    closeDrawer();
    if (done) reset();
  };

  const next = () => {
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(
      () => {
        setBusy(false);
        setDone(true);
      },
      reduced ? 50 : 1300,
    );
  };

  const d = day !== null ? days[day] : null;
  const doneTxt = f && d && slot !== null ? b.resaDone(f.nom, pers, b.jours[d.date.getDay()], d.date.getDate(), b.mois[d.date.getMonth()], slot, depot) : "";

  return (
    <Drawer
      id="resa"
      open={isOpen}
      onClose={close}
      label={t("RÉSERVER")}
      titre={t("RÉSERVER")}
      head={<Steps n={5} current={step} />}
      foot={
        !done && (
          <div className="r-foot">
            <button className="btn ghost" type="button" onClick={() => step > 0 && setStep(step - 1)} style={{ visibility: step === 0 ? "hidden" : "visible" }}>
              <span>{t("RETOUR")}</span>
            </button>
            <button className={"btn" + (ok ? "" : " off") + (busy ? " busy" : "")} id="r-next" type="button" onClick={next}>
              <span>{busy ? b.enCours : step === 4 ? b.payerAcompte(depot) : b.continuer}</span>
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
              <div className="r-days">
                {days.map((o, i) => (
                  <button
                    key={i}
                    type="button"
                    className={"r-day" + (day === i ? " sel" : "") + (o.closed ? " off" : "")}
                    disabled={o.closed}
                    onClick={() => {
                      setDay(i);
                      setSlot(null);
                    }}
                  >
                    <small>{b.jours[o.date.getDay()].toUpperCase()}</small>
                    <b>{o.date.getDate()}</b>
                    <span>{o.closed ? "—" : b.mois[o.date.getMonth()]}</span>
                  </button>
                ))}
              </div>
              <div className="r-slots">
                {d &&
                  hoursFor(espace, d.date).map((h) => {
                    const a = affOf(d.date, h);
                    return (
                      <button key={h} type="button" className={"r-slot" + (slot === h ? " sel" : "") + (a === 2 ? " charge" : "")} onClick={() => setSlot(h)}>
                        <b>{h}h00</b>
                        <span className="aff">
                          {[0, 1, 2].map((k) => (
                            <i key={k} className={k <= a ? "f" : ""} />
                          ))}
                        </span>
                        <small>{b.aff[a].toUpperCase()}</small>
                      </button>
                    );
                  })}
              </div>
              <div className="r-hint">{day === null ? b.hintJour : b.hintAff}</div>
            </div>
          )}
          {step === 3 && f && d && (
            <div className="rstep on">
              <div className="r-q">
                {t("Et pour ")}
                <em>{t("finir")}</em>.
              </div>
              <Field id="r-nom" label={t("VOTRE NOM")} placeholder={t("Prénom Nom")} value={nom} onChange={setNom} autoComplete="name" />
              <Field id="r-tel" label={t("TÉLÉPHONE")} placeholder="06 12 34 56 78" type="tel" value={tel} onChange={setTel} autoComplete="tel" />
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
                    {b.jours[d.date.getDay()]} {d.date.getDate()} {b.mois[d.date.getMonth()]} · {slot}h00
                  </b>
                </div>
                <div className="row">
                  <span>{b.recap.personnes}</span>
                  <b>{pers}</b>
                </div>
                <div className="row">
                  <span>{b.recap.acompte}</span>
                  <b>{euros(depot)}</b>
                </div>
                <div className="row">
                  <span>{b.recap.reste}</span>
                  <b>{euros(total - depot)}</b>
                </div>
                <div className="tot">
                  <span>{b.recap.total}</span>
                  <b>{euros(total)}</b>
                </div>
              </div>
              <div className="r-hint">{t("Démo — aucune réservation réelle n'est envoyée.")}</div>
            </div>
          )}
          {step === 4 && (
            <div className="rstep on">
              <div className="r-q">
                {t("L'")}
                <em>{t("acompte")}</em>.
              </div>
              <p className="r-hint" style={{ fontStyle: "normal", fontSize: 14, color: "var(--creme)" }}>
                {t("Un acompte de 10 € par personne garantit votre créneau. Il est ")}
                <b style={{ color: "var(--sable)" }}>{t("déduit de votre note sur place")}</b>
                {t(", et remboursé en cas d'annulation jusqu'à 24 h avant.")}
              </p>
              <div className="r-paybig">
                <span>{t("ACOMPTE À RÉGLER MAINTENANT")}</span>
                <b>{euros(depot)}</b>
                <small>{b.reste(total - depot, total)}</small>
              </div>
              <PayMethods sel={pay} onSelect={setPay} />
              <div className="r-secure">
                <Cadenas />
                <span>
                  {t("Paiement sécurisé — le module bancaire (Stripe) sera branché en production. ")}
                  <b>{t("Aucune carte n'est demandée dans cette démo.")}</b>
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}
