"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useSite } from "@/lib/site-context";
import Drawer, { Field, Opt } from "./Drawer";
import { PorteCoche } from "./Icons";

export default function DevisDrawer() {
  const { t, b } = useI18n();
  const { open, closeDrawer } = useSite();
  const isOpen = open === "devis";

  const [type, setType] = useState<number | null>(null);
  const [pers, setPers] = useState(10);
  const [repas, setRepas] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [nom, setNom] = useState("");
  const [contact, setContact] = useState("");
  const [done, setDone] = useState(false);

  const ok = type !== null && repas !== null && nom.trim().length > 1 && contact.trim().length > 5;

  const close = () => {
    closeDrawer();
    if (done) {
      setType(null);
      setPers(10);
      setRepas(null);
      setDate("");
      setNom("");
      setContact("");
      setDone(false);
    }
  };

  return (
    <Drawer
      id="gdevis"
      open={isOpen}
      onClose={close}
      label={t("Groupes & CSE")}
      titre={t("Groupes & CSE").toUpperCase()}
      foot={
        !done && (
          <div className="r-foot">
            <button className={"btn" + (ok ? "" : " off")} type="button" style={{ flexGrow: 1 }} onClick={() => setDone(true)}>
              <span>{t("RECEVOIR MON DEVIS SOUS 24 H")}</span>
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
            <em>{t("reçue")}</em>.
          </div>
          <p>{b.devisDone(b.types[type ?? 0], pers, repas === 0)}</p>
        </div>
      ) : (
        <div className="rstep on">
          <div className="r-q">
            {t("Votre ")}
            <em>{t("événement")}</em>.
          </div>
          <div className="r-opts" style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {b.types.map((x, i) => (
              <Opt key={x} sel={type === i} onClick={() => setType(i)} nom={<span style={{ fontSize: 17 }}>{x}</span>} style={{ padding: "12px 18px" }} />
            ))}
          </div>
          <div className="r-count">
            <button type="button" aria-label="Moins de personnes" onClick={() => setPers(Math.max(8, pers - 1))}>
              −
            </button>
            <b>{pers}</b>
            <button type="button" aria-label="Plus de personnes" onClick={() => setPers(Math.min(60, pers + 1))}>
              +
            </button>
            <span className="r-hint">{t("personnes (8 minimum pour privatiser)")}</span>
          </div>
          <div className="r-opts" style={{ flexDirection: "row", gap: 10 }}>
            {b.repas.map((x, i) => (
              <Opt key={x} sel={repas === i} onClick={() => setRepas(i)} nom={<span style={{ fontSize: 16 }}>{x}</span>} style={{ padding: "12px 18px" }} />
            ))}
          </div>
          <Field id="d-date" label={t("DATE SOUHAITÉE")} placeholder={t("ex. samedi 19 septembre, en soirée")} value={date} onChange={setDate} />
          <Field id="d-nom" label={t("VOTRE NOM (OU ENTREPRISE / CSE)")} placeholder={t("Prénom Nom — Société")} value={nom} onChange={setNom} />
          <Field id="d-contact" label={t("TÉLÉPHONE OU E-MAIL")} placeholder="06 12 34 56 78" value={contact} onChange={setContact} />
          <div className="r-hint">{t("Démo — aucune demande réelle n'est envoyée. En production : devis sous 24 h.")}</div>
        </div>
      )}
    </Drawer>
  );
}
