"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import DICT from "@/data/traductions.json";

export type Lang = "fr" | "en" | "ar";
const LANGS: Lang[] = ["fr", "en", "ar"];
const STORAGE_KEY = "casbah-lang";

/** Dictionnaire : clé = texte français, valeur = [en, ar]. */
const P = DICT as unknown as Record<string, [string, string]>;
const norm = (s: string) => s.replace(/ /g, " ").trim();
const PN: Record<string, [string, string]> = {};
for (const k of Object.keys(P)) PN[norm(k)] = P[k];

/** Textes dynamiques (dates, formulaires, messages) par langue. */
export type Bundle = {
  jours: string[];
  mois: string[];
  aff: [string, string, string];
  continuer: string;
  enCours: string;
  payerAcompte: (d: number) => string;
  payer: (a: number) => string;
  resaDone: (nom: string, pers: number, j: string, dt: number, m: string, h: number, dep: number) => string;
  giftDone: (amt: number, pour: string, de: string) => string;
  giftDest: (p: string) => string;
  devisDone: (t: string, p: number, avecRepas: boolean) => string;
  espaces: [{ nom: string; d: string }, { nom: string; d: string }];
  forfaitsD: [string, string, string];
  payNames: [string, string, string];
  payDs: [string, string, string];
  recap: { rituel: string; espace: string; date: string; personnes: string; acompte: string; reste: string; total: string; femmes: string; hommes: string };
  reste: (r: number, t: number) => string;
  hintJour: string;
  hintAff: string;
  giftLbls: Record<number, string>;
  types: string[];
  repas: [string, string];
};

const B: Record<Lang, Bundle> = {
  fr: {
    jours: ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"],
    mois: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
    aff: ["Calme", "Modéré", "Chargé"],
    continuer: "CONTINUER",
    enCours: "PAIEMENT EN COURS…",
    payerAcompte: (d) => "PAYER L'ACOMPTE — " + d + " €",
    payer: (a) => "PAYER — " + a + " €",
    resaDone: (nom, pers, j, dt, m, h, dep) =>
      `${nom} · ${pers} pers. · ${j} ${dt} ${m} à ${h}h. Acompte de ${dep} € réglé (démo) — il sera déduit de votre note sur place. Confirmation par SMS dans quelques minutes.`,
    giftDone: (amt, pour, de) =>
      `La carte de ${amt} € pour ${pour}${de ? " (de la part de " + de + ")" : ""} vient d'être envoyée par e-mail (démo) — un PDF élégant, valable 12 mois, à imprimer ou à transférer.`,
    giftDest: (p) => (p ? "Pour " + p + " — envoyée immédiatement par e-mail" : "Envoyée immédiatement par e-mail"),
    devisDone: (t, p, avecRepas) =>
      `${t} · ${p} personnes · ${avecRepas ? "avec repas" : "sans repas"} — nous revenons vers vous sous 24 h avec une proposition et un devis (démo).`,
    espaces: [
      { nom: "Espace Femmes", d: "mar 10h–22h · mer–lun 9h–14h30" },
      { nom: "Espace Hommes", d: "tous les jours 15h–22h · fermé le mardi" },
    ],
    forfaitsD: ["Bains en accès libre · 2h", "Bains + gommage savon noir · 2h30", "Rituel + plat au restaurant · 3h"],
    payNames: ["Carte bancaire", "Apple Pay", "PayPal"],
    payDs: ["Visa · Mastercard · CB", "Paiement en un geste", "Compte PayPal"],
    recap: { rituel: "Rituel", espace: "Espace", date: "Date", personnes: "Personnes", acompte: "Acompte en ligne (déduit sur place)", reste: "Reste à régler sur place", total: "TOTAL", femmes: "Femmes", hommes: "Hommes" },
    reste: (r, t) => `Reste ${r} € à régler sur place — total ${t} €`,
    hintJour: "Choisissez d'abord un jour.",
    hintAff: "L'indicateur sous chaque heure estime l'affluence — venez sur les créneaux calmes pour une expérience plus sereine.",
    giftLbls: { 39: "Le Rituel Signature", 49: "L'Évasion Complète", 75: "Évasion + soins", 100: "Évasion pour deux" },
    types: ["EVJF", "Anniversaire", "Équipe & CSE", "Autre"],
    repas: ["Avec repas au restaurant", "Sans repas"],
  },
  en: {
    jours: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    mois: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    aff: ["Quiet", "Moderate", "Busy"],
    continuer: "CONTINUE",
    enCours: "PROCESSING PAYMENT…",
    payerAcompte: (d) => "PAY THE DEPOSIT — €" + d,
    payer: (a) => "PAY — €" + a,
    resaDone: (nom, pers, j, dt, m, h, dep) =>
      `${nom} · ${pers} people · ${j} ${dt} ${m} at ${h}:00. €${dep} deposit paid (demo) — it will be deducted from your bill on site. SMS confirmation in a few minutes.`,
    giftDone: (amt, pour, de) =>
      `The €${amt} card for ${pour}${de ? " (from " + de + ")" : ""} has just been sent by e-mail (demo) — an elegant PDF, valid 12 months.`,
    giftDest: (p) => (p ? "For " + p + " — sent instantly by e-mail" : "Sent instantly by e-mail"),
    devisDone: (t, p, avecRepas) =>
      `${t} · ${p} people · ${avecRepas ? "with meal" : "without meal"} — we will get back to you within 24h with a proposal and a quote (demo).`,
    espaces: [
      { nom: "Women's area", d: "Tue 10am–10pm · Wed–Mon 9am–2:30pm" },
      { nom: "Men's area", d: "every day 3pm–10pm · closed Tuesdays" },
    ],
    forfaitsD: ["Free access to the baths · 2h", "Baths + black soap scrub · 2h30", "Ritual + a dish at the restaurant · 3h"],
    payNames: ["Bank card", "Apple Pay", "PayPal"],
    payDs: ["Visa · Mastercard", "One-tap payment", "PayPal account"],
    recap: { rituel: "Ritual", espace: "Area", date: "Date", personnes: "People", acompte: "Online deposit (deducted on site)", reste: "Balance due on site", total: "TOTAL", femmes: "Women", hommes: "Men" },
    reste: (r, t) => `€${r} left to pay on site — total €${t}`,
    hintJour: "Pick a day first.",
    hintAff: "The indicator under each hour estimates how busy it is — pick quiet slots for a more serene experience.",
    giftLbls: { 39: "Le Rituel Signature", 49: "L'Évasion Complète", 75: "Escape + treatments", 100: "Escape for two" },
    types: ["Hen party", "Birthday", "Team & Corporate", "Other"],
    repas: ["With a meal at the restaurant", "Without meal"],
  },
  ar: {
    jours: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    mois: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
    aff: ["هادئ", "متوسط", "مزدحم"],
    continuer: "متابعة",
    enCours: "جارٍ الدفع…",
    payerAcompte: (d) => "ادفع العربون — " + d + " €",
    payer: (a) => "ادفع — " + a + " €",
    resaDone: (nom, pers, j, dt, m, h, dep) =>
      `${nom} · ${pers} أشخاص · ${j} ${dt} ${m} الساعة ${h}:00. تم دفع عربون ${dep} € (تجريبي) — سيُخصم من فاتورتك في المكان. تأكيد عبر رسالة نصية خلال دقائق.`,
    giftDone: (amt, pour, de) =>
      `بطاقة ${amt} € لـ ${pour}${de ? " (من طرف " + de + ")" : ""} أُرسلت للتو بالبريد الإلكتروني (تجريبي) — PDF أنيق صالح 12 شهرًا.`,
    giftDest: (p) => (p ? "لـ " + p + " — تُرسل فورًا بالبريد الإلكتروني" : "تُرسل فورًا بالبريد الإلكتروني"),
    devisDone: (t, p, avecRepas) =>
      `${t} · ${p} أشخاص · ${avecRepas ? "مع وجبة" : "بدون وجبة"} — نعود إليكم خلال 24 ساعة بعرض وسعر (تجريبي).`,
    espaces: [
      { nom: "قسم النساء", d: "الثلاثاء 10–22 · الأربعاء–الاثنين 9–14:30" },
      { nom: "قسم الرجال", d: "يوميًا 15–22 · مغلق الثلاثاء" },
    ],
    forfaitsD: ["دخول حر إلى الحمّامات · ساعتان", "الحمّامات + تقشير بالصابون الأسود · ساعتان ونصف", "الطقس + طبق في المطعم · 3 ساعات"],
    payNames: ["بطاقة بنكية", "Apple Pay", "PayPal"],
    payDs: ["Visa · Mastercard", "دفع بلمسة واحدة", "حساب PayPal"],
    recap: { rituel: "الطقس", espace: "القسم", date: "التاريخ", personnes: "الأشخاص", acompte: "العربون عبر الإنترنت (يُخصم في المكان)", reste: "المتبقي يُدفع في المكان", total: "المجموع", femmes: "النساء", hommes: "الرجال" },
    reste: (r, t) => `يتبقى ${r} € تُدفع في المكان — المجموع ${t} €`,
    hintJour: "اختر يومًا أولًا.",
    hintAff: "المؤشر تحت كل ساعة يقدّر الازدحام — اختر الأوقات الهادئة لتجربة أكثر سكينة.",
    giftLbls: { 39: "Le Rituel Signature", 49: "L'Évasion Complète", 75: "استرخاء + عنايات", 100: "استرخاء لشخصين" },
    types: ["حفلة عزوبية", "عيد ميلاد", "فريق عمل وشركات", "أخرى"],
    repas: ["مع وجبة في المطعم", "بدون وجبة"],
  },
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Traduit un texte français (retourne le texte tel quel s'il n'a pas de traduction). */
  t: (fr: string) => string;
  b: Bundle;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved && LANGS.includes(saved)) setLangState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    if (!LANGS.includes(l)) return;
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const t = useCallback(
    (fr: string) => {
      if (lang === "fr") return fr;
      const tr = PN[norm(fr)];
      if (!tr) return fr;
      const idx = lang === "en" ? 0 : 1;
      const lead = fr.match(/^\s*/)?.[0] ?? "";
      const trail = fr.match(/\s*$/)?.[0] ?? "";
      return lead + tr[idx] + trail;
    },
    [lang],
  );

  const value = useMemo<Ctx>(() => ({ lang, setLang, t, b: B[lang] }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n doit être utilisé dans <I18nProvider>");
  return ctx;
}
