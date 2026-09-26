"use client";

import { useI18n } from "@/lib/i18n";
import { useSite } from "@/lib/site-context";

export default function Groupes() {
  const { t } = useI18n();
  const { openDrawer } = useSite();

  return (
    <section id="groupes">
      <div className="ctn">
        <div className="groupes-band" data-rv>
          <div className="t">
            <div className="eyebrow">
              <span className="rule" />
              <span>{t("GROUPES · EVJF · COMITÉS D'ENTREPRISE")}</span>
            </div>
            <h2 style={{ fontSize: "clamp(30px, 3.6vw, 46px)" }}>
              {t("Privatisez le hammam,")}
              <br />
              {t("restez pour le ")}
              <em>{t("dîner")}</em>.
            </h2>
            <p className="chap-copy">
              {t("Rituel en groupe puis table dressée pour vous — l'offre idéale pour les équipes de la zone d'activité de Roissy-en-Brie. Devis sous 24 h, à partir de 8 personnes.")}
            </p>
          </div>
          <a
            className="btn ghost"
            href="#groupes"
            data-mag
            data-cur
            onClick={(e) => {
              e.preventDefault();
              openDrawer("devis");
            }}
          >
            <span>{t("DEMANDER UN DEVIS")}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
