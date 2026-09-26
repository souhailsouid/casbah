"use client";

import { useI18n } from "@/lib/i18n";
import { useSite } from "@/lib/site-context";
import { FORMULE, SPECIALITES_APERCU } from "@/data/menu";
import { prix } from "@/lib/format";
import { Fleche } from "./Icons";

export default function Table() {
  const { t } = useI18n();
  const { openDrawer } = useSite();

  return (
    <section id="table">
      <div className="ctn">
        <div className="grid">
          <div>
            <div className="chap-head" style={{ marginBottom: 0 }}>
              <div className="eyebrow" data-rv>
                <span className="rule" />
                <span>{t("CHAPITRE II")}</span>
              </div>
              <h2 data-rv style={{ "--d": ".1s" } as React.CSSProperties}>
                {t("La Table — plus qu'un repas, une ")}
                <em>{t("expérience")}</em>.
              </h2>
              <p className="chap-copy" data-rv style={{ "--d": ".2s" } as React.CSSProperties}>
                {t("Brochettes, tagines mijotés, couscous le vendredi. On y vient enveloppé dans son peignoir après le hammam — ou juste pour la table.")}
              </p>
            </div>
            <div className="formule" data-rv style={{ "--d": ".3s" } as React.CSSProperties}>
              <div className="l">
                <small>{t(FORMULE.titre)}</small>
                <div>{t(FORMULE.detail)}</div>
                <div style={{ fontSize: 12, marginTop: 4, color: "#8A6A24" }}>{t("Suppl. agneau +2 €")}</div>
              </div>
              <div className="p">{prix(FORMULE.prix)}</div>
            </div>
            <button
              type="button"
              data-cur
              data-rv
              onClick={() => openDrawer("carte")}
              style={{ "--d": ".4s", display: "flex", alignItems: "center", gap: 10, background: "none", border: 0, padding: 0, marginTop: 26, cursor: "pointer" } as React.CSSProperties}
            >
              <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 14, fontWeight: 600, letterSpacing: ".08em", color: "var(--or)" }}>
                {t("VOIR TOUTE LA CARTE")}
              </span>
              <Fleche />
            </button>
          </div>
          <div className="carte" data-rv style={{ "--d": ".2s" } as React.CSSProperties}>
            <div className="head">{t("NOS SPÉCIALITÉS")}</div>
            {SPECIALITES_APERCU.map((p) => (
              <div className="plat" data-cur key={p.nom}>
                <span className="n">
                  {t(p.nom)}
                  {p.note && <span className="note"> {t(p.note)}</span>}
                </span>
                <span className="dots" />
                <span className="px">{prix(p.prix)}</span>
              </div>
            ))}
            <div className="foot">
              <span>{t("FAIT MAISON")}</span>
              <span className="rule" />
              <span>{t("PRODUITS DE QUALITÉ")}</span>
              <span className="rule" />
              <span>{t("MOMENTS DE PARTAGE")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
