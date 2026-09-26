"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { AVIS } from "@/data/site";
import { Etoile5 } from "./Icons";

export default function Avis() {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0); // relance le minuteur après un clic

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % AVIS.length), 5200);
    return () => clearInterval(id);
  }, [tick]);

  return (
    <section id="avis">
      <div className="ctn">
        <div className="stars" data-rv aria-label="4,8 sur 5">
          <Etoile5 />
          <Etoile5 />
          <Etoile5 />
          <Etoile5 />
          <Etoile5 partial />
        </div>
        <div className="quote-box" data-rv style={{ "--d": ".1s" } as React.CSSProperties}>
          {AVIS.map((a, k) => (
            <blockquote className={"quote" + (k === i ? " on" : "")} key={k}>
              <p>{t(a.texte)}</p>
              <cite>{t(a.auteur)}</cite>
            </blockquote>
          ))}
        </div>
        <div className="dots" data-rv style={{ "--d": ".2s" } as React.CSSProperties}>
          {AVIS.map((_, k) => (
            <button
              key={k}
              type="button"
              className={k === i ? "on" : ""}
              aria-label={`Avis ${k + 1}`}
              onClick={() => {
                setI(k);
                setTick((x) => x + 1);
              }}
            />
          ))}
        </div>
        <p className="avis-src" data-rv style={{ "--d": ".3s" } as React.CSSProperties}>
          <b>4,8 / 5</b> {t("· 312 avis Google")}
        </p>
      </div>
    </section>
  );
}
