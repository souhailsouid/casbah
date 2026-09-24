"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useSite } from "@/lib/site-context";
import { MONTANTS_CADEAU } from "@/data/site";
import { euros } from "@/lib/format";
import Drawer, { Field, Opt, PayMethods, Steps } from "./Drawer";
import { Cadenas, PorteCoche } from "./Icons";

export default function GiftDrawer() {
  const { t, b } = useI18n();
  const { open, closeDrawer, giftAmt, setGiftAmt } = useSite();
  const isOpen = open === "gift";

  const [step, setStep] = useState(0);
  const [pour, setPour] = useState("");
  const [de, setDe] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [pay, setPay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const ok = step === 0 ? !!giftAmt : step === 1 ? pour.trim().length > 1 && email.indexOf("@") > 0 : !!pay;

  const close = () => {
    closeDrawer();
    if (done) {
      setStep(0);
      setPour("");
      setDe("");
      setEmail("");
      setMsg("");
      setPay(null);
      setDone(false);
    }
  };
  const next = () => {
    if (step < 2) {
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

  return (
    <Drawer
      id="gcadeau"
      open={isOpen}
      onClose={close}
      label={t("OFFRIR")}
      titre={t("OFFRIR")}
      head={<Steps n={3} current={step} />}
      foot={
        !done && (
          <div className="r-foot">
            <button className="btn ghost" type="button" onClick={() => step > 0 && setStep(step - 1)} style={{ visibility: step === 0 ? "hidden" : "visible" }}>
              <span>{t("RETOUR")}</span>
            </button>
            <button className={"btn" + (ok ? "" : " off") + (busy ? " busy" : "")} id="g-next" type="button" onClick={next}>
              <span>{busy ? b.enCours : step === 2 ? b.payer(giftAmt) : b.continuer}</span>
            </button>
          </div>
        )
      }
    >
      {done ? (
        <div className="r-done on">
          <PorteCoche />
          <div className="t">
            {t("Carte cadeau ")}
            <em>{t("envoyée")}</em>.
          </div>
          <p>{b.giftDone(giftAmt, pour.trim(), de.trim())}</p>
        </div>
      ) : (
        <>
          {step === 0 && (
            <div className="rstep on">
              <div className="r-q">
                {t("Quel ")}
                <em>{t("montant")}</em>&nbsp;?
              </div>
              <div className="r-opts">
                {MONTANTS_CADEAU.map((m) => (
                  <Opt key={m} sel={giftAmt === m} onClick={() => setGiftAmt(m)} nom={euros(m)} d={b.giftLbls[m]} />
                ))}
              </div>
              <div className="r-hint">{t("Repères : 25 € l'entrée aux bains · 39 € le rituel avec gommage · 49 € le rituel + repas.")}</div>
            </div>
          )}
          {step === 1 && (
            <div className="rstep on">
              <div className="r-q">
                {t("Pour ")}
                <em>{t("qui")}</em>&nbsp;?
              </div>
              <Field id="g-pour" label={t("POUR")} placeholder={t("Prénom du destinataire")} value={pour} onChange={setPour} />
              <Field id="g-de" label={t("DE LA PART DE")} placeholder={t("Votre prénom")} value={de} onChange={setDe} />
              <Field id="g-email" label={t("E-MAIL DU DESTINATAIRE (OU LE VÔTRE)")} placeholder="prenom@email.fr" type="email" value={email} onChange={setEmail} />
              <Field id="g-msg" label={t("PETIT MOT (FACULTATIF)")} placeholder={t("« Prends soin de toi… »")} value={msg} onChange={setMsg} />
            </div>
          )}
          {step === 2 && (
            <div className="rstep on">
              <div className="r-q">
                {t("Le ")}
                <em>{t("règlement")}</em>.
              </div>
              <div className="r-paybig">
                <span>{t("CARTE CADEAU")}</span>
                <b>{euros(giftAmt)}</b>
                <small>{b.giftDest(pour.trim())}</small>
              </div>
              <PayMethods sel={pay} onSelect={setPay} />
              <div className="r-secure">
                <Cadenas />
                <span>
                  {t("Paiement sécurisé — module bancaire branché en production. ")}
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
