"use client";

import { useI18n } from "@/lib/i18n";
import { useSite } from "@/lib/site-context";
import { CARTE, FORMULE } from "@/data/menu";
import { prix } from "@/lib/format";
import Drawer from "./Drawer";
import { Agrandir } from "./Icons";

// Chemin relatif (et non « /menu.jpg ») : l'hébergeur artifact ne résout pas les chemins absolus.
const MENU_IMG = "menu.jpg";

/** Tiroir « La carte » : version texte (data/menu.ts) + menu illustré (public/menu.jpg). */
export default function CarteDrawer() {
  const { t } = useI18n();
  const { open, closeDrawer, lightbox, setLightbox } = useSite();
  const isOpen = open === "carte";

  return (
    <>
      <Drawer
        id="gcarte"
        open={isOpen}
        onClose={closeDrawer}
        wide
        label={t("LA CARTE")}
        titre={t("LA CARTE")}
        head={<span style={{ fontSize: 11, letterSpacing: ".22em", color: "rgba(241,232,212,.5)" }}>{t("CUISINE ORIENTALE · PRODUITS DE QUALITÉ")}</span>}
        bodyStyle={{ gap: 28 }}
      >
        <div className="c-tabs" role="tablist">
          <button type="button" className="c-tab on" role="tab" aria-selected="true">
            {t("LA CARTE")}
          </button>
          <button
            type="button"
            className="c-tab"
            role="tab"
            aria-selected="false"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9 }}
            onClick={() => setLightbox(true)}
          >
            {t("LE MENU ILLUSTRÉ")}
            <Agrandir />
          </button>
        </div>

        <div className="c-pane on">
          <div style={{ background: "#F1E8D4", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontFamily: "'Marcellus', serif", fontSize: 10, letterSpacing: ".24em", color: "#8A6A24" }}>{t(FORMULE.titre)}</span>
              <span style={{ fontSize: 14, color: "#24291F" }}>{t(FORMULE.detail)}</span>
              <span style={{ fontSize: 12, fontStyle: "italic", color: "#8A6A24" }}>{t(FORMULE.supplement)}</span>
            </div>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 32, color: "#16281F", whiteSpace: "nowrap" }}>{prix(FORMULE.prix)}</span>
          </div>

          <div className="c-cols">
            {CARTE.map((sec) => (
              <div className="c-sec" key={sec.id}>
                <div className="c-h">
                  {t(sec.titre)}
                  {sec.sousTitre && <i>{t(sec.sousTitre)}</i>}
                </div>
                {sec.items.map((it) => (
                  <div className="c-row" key={it.nom}>
                    <span>
                      {t(it.nom)}
                      {it.note && <i> — {t(it.note)}</i>}
                    </span>
                    <span className="c-dots" />
                    <b>{prix(it.prix)}</b>
                  </div>
                ))}
                {sec.note && <div className="c-note">{t(sec.note)}</div>}
              </div>
            ))}
          </div>
        </div>

        <img
          id="menu-img"
          src={MENU_IMG}
          alt={t("Le menu illustré du restaurant La Casbah — cliquer pour agrandir")}
          title={t("Cliquer pour agrandir")}
          loading="lazy"
          onClick={() => setLightbox(true)}
          style={{ width: "100%", display: "block", border: "1px solid rgba(201,164,92,.35)" }}
        />
        <div className="r-hint" style={{ textAlign: "center" }}>
          {t("La carte du restaurant — également disponible en version illustrée.")}
        </div>
      </Drawer>

      <div id="lightbox" className={lightbox ? "on" : ""} role="dialog" aria-modal="true" aria-label={t("LE MENU ILLUSTRÉ")} aria-hidden={!lightbox} onClick={() => setLightbox(false)}>
        <button className="lb-close" type="button" aria-label={t("Fermer")}>
          ×
        </button>
        {lightbox && <img src={MENU_IMG} alt={t("Le menu illustré du restaurant La Casbah — cliquer pour agrandir")} />}
      </div>
    </>
  );
}
