"use client";

import { useI18n } from "@/lib/i18n";
import { useSite } from "@/lib/site-context";
import { FORFAITS, TEMPERATURES } from "@/data/site";
import { euros } from "@/lib/format";

export default function Bains() {
  const { t } = useI18n();
  const { openResa } = useSite();

  return (
    <>
      <section id="bains">
        <div className="ctn">
          <div className="chap-head">
            <div className="eyebrow" data-rv>
              <span className="rule" />
              <span>{t("CHAPITRE I")}</span>
            </div>
            <h2 data-rv style={{ "--d": ".1s" } as React.CSSProperties}>
              {t("Les Bains — des rituels clairs,")}
              <br />
              {t("des prix ")}
              <em>{t("affichés")}</em>.
            </h2>
          </div>

          <div className="temps" data-rv>
            {TEMPERATURES.map((tp) => (
              <div className="temp" key={tp.label}>
                <div className="n">
                  <span data-count={tp.valeur}>0</span>
                  <sup>°C</sup>
                </div>
                <div className="l">{t(tp.label)}</div>
                <div className="d">{t(tp.detail)}</div>
              </div>
            ))}
          </div>

          <div className="forfaits">
            {FORFAITS.map((f, i) => (
              <article
                key={f.id}
                className={"forfait" + (f.star ? " star" : "")}
                data-rv
                data-cur
                style={{ "--d": `${i * 0.12}s` } as React.CSSProperties}
                role="button"
                tabIndex={0}
                aria-label={`${t("RÉSERVER")} ${f.nom}`}
                onClick={() => openResa(f.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openResa(f.id);
                  }
                }}
              >
                {f.star && <div className="tag">{t("LE PLUS CHOISI")}</div>}
                <div className="num">{f.num}</div>
                <h3>
                  {f.titre[0]}
                  <br />
                  {f.titre[1]}
                </h3>
                <ul>
                  {f.inclus.map((l) => (
                    <li key={l}>{t(l)}</li>
                  ))}
                </ul>
                <div className="foot">
                  <div className="prix">
                    {euros(f.prix)} <small>{t("/ pers.")}</small>
                  </div>
                  <div className="duree">{f.duree}</div>
                </div>
              </article>
            ))}
          </div>
          <p className="bains-note" data-rv>
            {t("Massages & soins à la carte sur place — gommage 15 €, massage relaxant à partir de 35 €.")}
          </p>
        </div>
      </section>

      <div className="interlude" aria-hidden="true">
        <div className="irail">
          {[0, 1].map((n) => (
            <div className="big" key={n}>
              {t("la vapeur, le gommage,")} <b>{t("puis la table")}</b> —{" "}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
