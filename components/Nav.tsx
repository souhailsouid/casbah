"use client";

import { useEffect, useState } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { useSite } from "@/lib/site-context";
import { Porte } from "./Icons";

const LIENS: [string, string][] = [
  ["#bains", "Les Bains"],
  ["#table", "La Table"],
  ["#offrir", "Offrir"],
  ["#groupes", "Groupes & CSE"],
  ["#infos", "Infos"],
];

export default function Nav() {
  const { t, lang, setLang } = useI18n();
  const { openResa } = useSite();
  const [solid, setSolid] = useState(false);
  const [hide, setHide] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 40);
      setHide(y > 300 && y > lastY);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
  }, [menu]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <nav id="nav" className={(solid ? "solid " : "") + (hide ? "hide" : "")}>
        <a className="brand" href="#hero" aria-label="La Casbah — accueil">
          <Porte size={24} />
          <span className="word">
            <b>LA CASBAH</b>
            <small>{t("HAMMAM · SPA · RESTAURANT")}</small>
          </span>
        </a>
        <div className="links">
          {LIENS.map(([href, label]) => (
            <a key={href} href={href} data-cur>
              {t(label)}
            </a>
          ))}
        </div>
        <div className="nav-right">
          <select id="lang-sel" aria-label={t("Langue / Language")} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            <option value="fr">FR</option>
            <option value="en">EN</option>
            <option value="ar">AR</option>
          </select>
          <a
            className="btn sm"
            href="#bains"
            data-mag
            data-cur
            onClick={(e) => {
              e.preventDefault();
              openResa(null);
            }}
          >
            <span>{t("RÉSERVER")}</span>
          </a>
          <button id="burger" aria-label={t("Ouvrir le menu")} aria-expanded={menu} onClick={() => setMenu(true)}>
            <i />
            <i />
            <i />
          </button>
        </div>
      </nav>

      <div id="menu" className={menu ? "open" : ""} aria-hidden={!menu}>
        <button className="close" aria-label={t("Fermer le menu")} onClick={() => setMenu(false)}>
          ×
        </button>
        <a href="#bains" onClick={() => setMenu(false)}>
          {t("Les ")}
          <em>{t("Bains")}</em>
        </a>
        <a href="#table" onClick={() => setMenu(false)}>
          {t("La ")}
          <em>{t("Table")}</em>
        </a>
        <a href="#offrir" onClick={() => setMenu(false)}>
          <em>{t("Offrir")}</em>
        </a>
        <a href="#groupes" onClick={() => setMenu(false)}>
          {t("Groupes & CSE")}
        </a>
        <a href="#infos" onClick={() => setMenu(false)}>
          {t("Infos pratiques")}
        </a>
      </div>
    </>
  );
}
