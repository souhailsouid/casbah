"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ForfaitId } from "@/data/site";

export type DrawerId = "resa" | "gift" | "devis" | "carte";

type Ctx = {
  open: DrawerId | null;
  openDrawer: (id: DrawerId) => void;
  closeDrawer: () => void;
  /** Forfait présélectionné dans le tiroir de réservation. */
  forfait: ForfaitId | null;
  openResa: (forfait?: ForfaitId | null) => void;
  /** Montant sélectionné sur la carte cadeau (section Offrir → tiroir). */
  giftAmt: number;
  setGiftAmt: (n: number) => void;
  lightbox: boolean;
  setLightbox: (v: boolean) => void;
};

const SiteContext = createContext<Ctx | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<DrawerId | null>(null);
  const [forfait, setForfait] = useState<ForfaitId | null>(null);
  const [giftAmt, setGiftAmt] = useState(49);
  const [lightbox, setLightbox] = useState(false);

  const openDrawer = useCallback((id: DrawerId) => setOpen(id), []);
  const closeDrawer = useCallback(() => setOpen(null), []);
  const openResa = useCallback((f?: ForfaitId | null) => {
    if (f) setForfait(f);
    setOpen("resa");
  }, []);

  // Bloque le défilement de la page quand un tiroir est ouvert.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Échap : ferme la lightbox, sinon le tiroir ouvert.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (lightbox) setLightbox(false);
      else setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const value = useMemo<Ctx>(
    () => ({ open, openDrawer, closeDrawer, forfait, openResa, giftAmt, setGiftAmt, lightbox, setLightbox }),
    [open, openDrawer, closeDrawer, forfait, openResa, giftAmt, lightbox],
  );
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): Ctx {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite doit être utilisé dans <SiteProvider>");
  return ctx;
}
