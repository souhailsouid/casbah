"use client";

import { useI18n } from "@/lib/i18n";

export default function Infos() {
  const { t } = useI18n();
  return (
    <section id="infos">
      <div className="ctn">
        <div className="chap-head">
          <div className="eyebrow" data-rv>
            <span className="rule" />
            <span>{t("INFOS PRATIQUES")}</span>
          </div>
          <h2 data-rv style={{ "--d": ".1s", fontSize: "clamp(32px, 4vw, 52px)" } as React.CSSProperties}>
            {t("Nos ")}
            <em>{t("horaires")}</em>.
          </h2>
        </div>
        <div className="infos-grid">
          <div className="info" data-rv>
            <div className="l">{t("FEMMES")}</div>
            <div className="row">
              <b>{t("Mardi")}</b>
              <span>10h00 — 22h00</span>
            </div>
            <div className="row">
              <b>{t("Mercredi au lundi")}</b>
              <span>9h00 — 14h30</span>
            </div>
          </div>
          <div className="info" data-rv style={{ "--d": ".1s" } as React.CSSProperties}>
            <div className="l">{t("HOMMES")}</div>
            <div className="row">
              <b>{t("Tous les jours")}</b>
              <span>15h00 — 22h00</span>
            </div>
            <div className="ferme">{t("Fermé le mardi")}</div>
          </div>
          <div className="info" data-rv style={{ "--d": ".2s" } as React.CSSProperties}>
            <div className="l">{t("RESTAURANT")}</div>
            <div className="row">
              <b>{t("Midi & soir")}</b>
              <span>{t("7j / 7")}</span>
            </div>
            <div className="row">
              <b>{t("Formule déjeuner")}</b>
              <span>{t("lun — ven")}</span>
            </div>
          </div>
        </div>
        <p className="demo-note">{t("Site de démonstration — prix, avis et horaires fictifs, à valider avec l'établissement.")}</p>
      </div>
    </section>
  );
}
