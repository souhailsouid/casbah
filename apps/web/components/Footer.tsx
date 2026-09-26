"use client";

import { useI18n } from "@/lib/i18n";
import { useSite } from "@/lib/site-context";
import { CONTACT } from "@/data/site";
import { Losange } from "./Icons";

export default function Footer() {
  const { t } = useI18n();
  const { openDrawer, openResa } = useSite();

  return (
    <footer>
      <div className="ctn">
        <div className="foot-mark" aria-hidden="true">
          LA CASBAH
        </div>
        <div className="foot-lockup" aria-hidden="true">
          <span>HAMMAM · SPA</span>
          <div className="lk">
            <i />
            <Losange size={11} />
            <i />
          </div>
          <em>Restaurant</em>
        </div>
        <div className="foot-grid">
          <div className="foot-col">
            <span className="l">{t("LE LIEU")}</span>
            <span>{CONTACT.adresse}</span>
            <span>{CONTACT.ville}</span>
            <span>{CONTACT.telephone}</span>
          </div>
          <div className="foot-col">
            <span className="l">{t("DÉCOUVRIR")}</span>
            <a href="#bains" data-cur>
              {t("Les Bains")}
            </a>
            <a href="#table" data-cur>
              {t("La Table")}
            </a>
            <a
              href="#offrir"
              data-cur
              onClick={(e) => {
                e.preventDefault();
                openDrawer("gift");
              }}
            >
              {t("Cartes cadeaux")}
            </a>
          </div>
          <div className="foot-col">
            <span className="l">{t("RÉSERVER")}</span>
            <a
              href="#bains"
              data-cur
              onClick={(e) => {
                e.preventDefault();
                openResa(null);
              }}
            >
              {t("Choisir un créneau")}
            </a>
            <a href="#groupes" data-cur>
              {t("Groupes & CSE")}
            </a>
          </div>
          <div className="foot-col">
            <span className="l">{t("SUIVEZ-NOUS")}</span>
            <a href="#hero" data-cur>
              Instagram
            </a>
            <a href="#hero" data-cur>
              Facebook
            </a>
          </div>
        </div>
        <div className="foot-base">
          <span className="rule" />
          <span>{t("LA CASBAH — PLUS QU'UN REPAS, UNE EXPÉRIENCE.")}</span>
          <span className="rule" />
        </div>
      </div>
    </footer>
  );
}
