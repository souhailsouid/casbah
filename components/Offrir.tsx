"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useSite } from "@/lib/site-context";
import { MONTANTS_CADEAU } from "@/data/site";
import { euros } from "@/lib/format";
import { Porte } from "./Icons";

export default function Offrir() {
  const { t } = useI18n();
  const { giftAmt, setGiftAmt, openDrawer } = useSite();
  const [shown, setShown] = useState(giftAmt);
  const giftRef = useRef<HTMLDivElement>(null);

  // Compteur animé du montant sur la carte.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(giftAmt);
      return;
    }
    let raf = 0;
    const from = shown;
    let t0: number | null = null;
    const step = (now: number) => {
      if (t0 === null) t0 = now;
      const p = Math.min((now - t0) / 500, 1);
      setShown(Math.round(from + (giftAmt - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giftAmt]);

  // Inclinaison 3D de la carte au survol.
  useEffect(() => {
    const el = giftRef.current;
    if (!el) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `rotateY(${px * 14}deg) rotateX(${-py * 12}deg)`;
    };
    const leave = () => {
      el.style.transition = "transform .7s cubic-bezier(.22,1,.36,1)";
      el.style.transform = "";
      setTimeout(() => (el.style.transition = ""), 700);
    };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <section id="offrir">
      <div className="ctn">
        <div className="grid">
          <div>
            <div className="eyebrow" data-rv>
              <span className="rule" />
              <span>{t("CHAPITRE III")}</span>
            </div>
            <h2 data-rv style={{ "--d": ".1s", marginTop: 18 } as React.CSSProperties}>
              {t("Offrir une ")}
              <em>{t("évasion")}</em>.
            </h2>
            <p className="chap-copy" data-rv style={{ "--d": ".2s", marginTop: 20 } as React.CSSProperties}>
              {t("La carte cadeau La Casbah s'achète en trois clics et arrive immédiatement par e-mail — un hammam, un dîner, ou les deux.")}
            </p>
            <div className="chips" data-rv style={{ "--d": ".3s" } as React.CSSProperties}>
              {MONTANTS_CADEAU.map((m) => (
                <button key={m} type="button" className={"chip" + (giftAmt === m ? " on" : "")} onClick={() => setGiftAmt(m)}>
                  {euros(m)}
                </button>
              ))}
            </div>
            <a
              className="btn"
              href="#offrir"
              data-mag
              data-cur
              data-rv
              style={{ "--d": ".4s" } as React.CSSProperties}
              onClick={(e) => {
                e.preventDefault();
                openDrawer("gift");
              }}
            >
              <span>{t("OFFRIR CETTE ÉVASION")}</span>
            </a>
          </div>
          <div className="gift-wrap" data-rv style={{ "--d": ".25s" } as React.CSSProperties}>
            <div className="gift" id="gift" data-cur ref={giftRef}>
              <div className="shine" />
              <div className="top">
                <div>
                  <b>LA CASBAH</b>
                  <small>{t("CARTE CADEAU")}</small>
                </div>
                <Porte size={30} stroke={1.2} />
              </div>
              <div className="amount">
                <div className="val" id="giftval">
                  {shown}
                </div>
                <span>
                  {t("EUROS")}
                  <br />
                  {t("D'ÉVASION")}
                </span>
              </div>
              <div className="bottom">
                <span>{t("POUR : ______________")}</span>
                <span>{t("VALABLE 12 MOIS")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
