"use client";

import { useI18n } from "@/lib/i18n";
import { useSite } from "@/lib/site-context";
import { FORFAITS, MARQUEE } from "@/data/site";
import { Etoile4 } from "./Icons";

export default function Hero() {
  const { t } = useI18n();
  const { openResa } = useSite();
  const evasion = FORFAITS.find((f) => f.id === "evasion")!;

  return (
    <>
      <header id="hero">
        <canvas id="steam" aria-hidden="true" />
        <svg className="hero-arch" viewBox="0 0 760 520" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="362" y="8" width="36" height="36" rx="5" fill="rgba(201,164,92,.2)" />
          <path d="M120 520 V72 H640 V520" stroke="rgba(201,164,92,.22)" strokeWidth="1.4" />
          <path d="M172 520 V124 H588 V520" stroke="rgba(201,164,92,.12)" strokeWidth="1" />
          <path d="M70 185 C72.5 197 73 197.5 85 200 C73 202.5 72.5 203 70 215 C67.5 203 67 202.5 55 200 C67 197.5 67.5 197 70 185 Z" fill="rgba(201,164,92,.3)" />
          <path d="M690 185 C692.5 197 693 197.5 705 200 C693 202.5 692.5 203 690 215 C687.5 203 687 202.5 675 200 C687 197.5 687.5 197 690 185 Z" fill="rgba(201,164,92,.3)" />
        </svg>
        <div className="ctn hero-inner">
          <div className="kicker" data-rv>
            <span className="line" />
            <span>
              {t("HAMMAM · SPA · RESTAURANT ORIENTAL —")} <i style={{ fontStyle: "normal", whiteSpace: "nowrap" }}>ROISSY-EN-BRIE</i>
            </span>
            <span className="line" />
          </div>
          <h1 id="h1">
            <span className="ln">
              <span>{t("La vapeur,")}</span>
            </span>
            <span className="ln">
              <span>{t("le gommage,")}</span>
            </span>
            <span className="ln">
              <span>
                {t("puis ")}
                <em>{t("la table")}</em>.
              </span>
            </span>
          </h1>
          <p className="hero-sub" data-rv style={{ "--d": ".35s" } as React.CSSProperties}>
            {t("Le seul hammam d'Île-de-France où le rituel se termine autour d'un tajine. Vapeur, savon noir, thé à la menthe — et la carte de notre restaurant.")}
          </p>
          <div className="hero-cta" data-rv style={{ "--d": ".5s" } as React.CSSProperties}>
            <a
              className="btn"
              href="#bains"
              data-mag
              data-cur
              onClick={(e) => {
                e.preventDefault();
                openResa(evasion.id);
              }}
            >
              <span>{t("RÉSERVER LA FORMULE ÉVASION — 49 €")}</span>
            </a>
            <a className="btn ghost" href="#bains" data-mag data-cur>
              <span>{t("DÉCOUVRIR LES BAINS")}</span>
            </a>
          </div>
        </div>
        <div className="scroll-cue" aria-hidden="true">
          <small>{t("DÉFILER")}</small>
          <div className="track">
            <i />
          </div>
        </div>
      </header>

      <div className="marquee" aria-hidden="true">
        <div className="rail">
          {[0, 1].map((n) => (
            <div className="set" key={n}>
              {MARQUEE.map((m) => (
                <span className="it" key={m}>
                  {t(m)}
                  <Etoile4 />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
