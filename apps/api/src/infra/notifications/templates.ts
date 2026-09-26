import { FORFAITS, type Locale, type NotificationEvent, type Reservation } from "@casbah/shared";
import { config } from "../../config.js";

export type Audience = "customer" | "merchant";

export interface Message {
  /** Nom du template WhatsApp approuvé chez Meta + code langue + paramètres positionnels du corps. */
  whatsapp: { template: string; language: string; params: string[] };
  /** Sujet et contenu structuré pour l'e-mail (rendu par React Email). */
  email: { subject: string; title: string; lines: string[]; cta?: { label: string; url: string } };
  /** Version texte (mode console, journal). */
  text: string;
}

const ESPACE_LABEL: Record<Locale, Record<"femmes" | "hommes", string>> = {
  fr: { femmes: "Espace Femmes", hommes: "Espace Hommes" },
  en: { femmes: "Women's area", hommes: "Men's area" },
  ar: { femmes: "قسم النساء", hommes: "قسم الرجال" },
};

const WA_LANG: Record<Locale, string> = { fr: "fr", en: "en", ar: "ar" };

export function formatDate(date: string, locale: Locale, timezone = "Europe/Paris"): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : locale === "en" ? "en-GB" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: timezone,
  }).format(dt);
}

export function formatHour(hour: number, locale: Locale): string {
  return locale === "fr" ? `${hour}h00` : `${String(hour).padStart(2, "0")}:00`;
}

export function adminUrl(reservationId?: string): string {
  return `${config.webUrl}/admin${reservationId ? `/reservation?id=${reservationId}` : ""}`;
}

export function cancelUrl(reservationId: string, token: string): string {
  return `${config.webUrl}/annulation?id=${encodeURIComponent(reservationId)}&token=${encodeURIComponent(token)}`;
}

/** Construit le message d'un événement pour un destinataire donné. */
export function buildMessage(
  event: NotificationEvent,
  audience: Audience,
  r: Reservation,
  opts: { cancelToken?: string; reason?: string; merchantName: string } = { merchantName: "La Casbah" },
): Message {
  const locale: Locale = audience === "merchant" ? "fr" : r.customer.locale;
  const date = formatDate(r.date, locale);
  const hour = formatHour(r.hour, locale);
  const forfait = FORFAITS[r.forfait].nom;
  const espace = ESPACE_LABEL[locale][r.espace];
  const persons = String(r.persons);
  const name = r.customer.name;
  const cancel = opts.cancelToken ? cancelUrl(r.id, opts.cancelToken) : undefined;
  const lang = WA_LANG[locale];

  if (audience === "merchant") {
    const url = adminUrl(r.id);
    const base = `${name} · ${persons} pers. · ${date} ${hour} · ${forfait} · ${espace} · ${r.customer.phone}`;
    switch (event) {
      case "reservation.received":
        return {
          whatsapp: { template: "casbah_merchant_new_request", language: "fr", params: [name, persons, `${date} ${hour}`, forfait, espace, r.customer.phone] },
          email: {
            subject: `Nouvelle demande : ${name}, ${date} ${hour}`,
            title: "Nouvelle demande de réservation",
            lines: [base, r.notes ? `Note du client : ${r.notes}` : "", "À confirmer ou refuser depuis l'interface."].filter(Boolean),
            cta: { label: "Ouvrir la demande", url },
          },
          text: `Nouvelle demande — ${base} — ${url}`,
        };
      case "reservation.cancelled":
        return {
          whatsapp: { template: "casbah_merchant_cancelled", language: "fr", params: [name, `${date} ${hour}`, persons] },
          email: { subject: `Annulation : ${name}, ${date} ${hour}`, title: "Réservation annulée par le client", lines: [base], cta: { label: "Voir", url } },
          text: `Annulation client — ${base}`,
        };
      default:
        throw new Error(`Pas de message marchand pour ${event}`);
    }
  }

  // Client
  const T = TEXTS[locale];
  switch (event) {
    case "reservation.received":
      return {
        whatsapp: { template: "casbah_reservation_received", language: lang, params: [name, `${date} ${hour}`, persons, forfait] },
        email: { subject: T.receivedSubject, title: T.receivedTitle, lines: [T.hello(name), T.summary(date, hour, persons, forfait, espace), T.receivedBody] },
        text: `${T.receivedTitle} — ${T.summary(date, hour, persons, forfait, espace)}`,
      };
    case "reservation.confirmed":
      return {
        whatsapp: { template: "casbah_reservation_confirmed", language: lang, params: [name, `${date} ${hour}`, persons, forfait, espace, cancel ?? T.cancelByPhone] },
        email: {
          subject: T.confirmedSubject(date, hour),
          title: T.confirmedTitle,
          lines: [T.hello(name), T.summary(date, hour, persons, forfait, espace), T.confirmedBody(r.depositDue), cancel ? "" : T.cancelByPhone].filter(Boolean),
          cta: cancel ? { label: T.cancelCta, url: cancel } : undefined,
        },
        text: `${T.confirmedTitle} — ${T.summary(date, hour, persons, forfait, espace)}${cancel ? ` — ${cancel}` : ""}`,
      };
    case "reservation.declined":
      return {
        whatsapp: { template: "casbah_reservation_declined", language: lang, params: [name, `${date} ${hour}`, opts.reason ?? T.declinedDefaultReason] },
        email: {
          subject: T.declinedSubject,
          title: T.declinedTitle,
          lines: [T.hello(name), T.declinedBody(date, hour), opts.reason ? `${T.reasonLabel} ${opts.reason}` : ""].filter(Boolean),
          cta: { label: T.rebookCta, url: `${config.webUrl}/#bains` },
        },
        text: `${T.declinedTitle} — ${date} ${hour}`,
      };
    case "reservation.cancelled":
      return {
        whatsapp: { template: "casbah_reservation_cancelled", language: lang, params: [name, `${date} ${hour}`] },
        email: { subject: T.cancelledSubject, title: T.cancelledTitle, lines: [T.hello(name), T.cancelledBody(date, hour)] },
        text: `${T.cancelledTitle} — ${date} ${hour}`,
      };
    case "reservation.reminder":
      return {
        whatsapp: { template: "casbah_reservation_reminder", language: lang, params: [name, hour, forfait, espace] },
        email: { subject: T.reminderSubject(hour), title: T.reminderTitle, lines: [T.hello(name), T.summary(date, hour, persons, forfait, espace), T.reminderBody] },
        text: `${T.reminderTitle} — ${date} ${hour}`,
      };
  }
}

const TEXTS: Record<Locale, {
  hello: (n: string) => string;
  summary: (d: string, h: string, p: string, f: string, e: string) => string;
  receivedSubject: string; receivedTitle: string; receivedBody: string;
  confirmedSubject: (d: string, h: string) => string; confirmedTitle: string; confirmedBody: (dep: number) => string; cancelCta: string; cancelByPhone: string;
  declinedSubject: string; declinedTitle: string; declinedBody: (d: string, h: string) => string; declinedDefaultReason: string; reasonLabel: string; rebookCta: string;
  cancelledSubject: string; cancelledTitle: string; cancelledBody: (d: string, h: string) => string;
  reminderSubject: (h: string) => string; reminderTitle: string; reminderBody: string;
}> = {
  fr: {
    hello: (n) => `Bonjour ${n},`,
    summary: (d, h, p, f, e) => `${d} à ${h} · ${p} personne(s) · ${f} · ${e}`,
    receivedSubject: "Votre demande de réservation à La Casbah",
    receivedTitle: "Demande bien reçue",
    receivedBody: "Nous vous confirmons votre créneau sous 2 heures.",
    confirmedSubject: (d, h) => `Réservation confirmée — ${d} à ${h}`,
    confirmedTitle: "Réservation confirmée",
    confirmedBody: (dep) => `Un acompte de ${dep} € vous sera demandé sur place, déduit de votre note. Pensez au maillot de bain.`,
    cancelCta: "Annuler ma réservation",
    cancelByPhone: "Pour annuler, appelez-nous au moins 24 h avant.",
    declinedSubject: "Créneau indisponible — La Casbah",
    declinedTitle: "Créneau indisponible",
    declinedBody: (d, h) => `Désolé, nous ne pouvons pas vous accueillir le ${d} à ${h}.`,
    declinedDefaultReason: "créneau complet",
    reasonLabel: "Motif :",
    rebookCta: "Choisir un autre créneau",
    cancelledSubject: "Réservation annulée — La Casbah",
    cancelledTitle: "Réservation annulée",
    cancelledBody: (d, h) => `Votre réservation du ${d} à ${h} est annulée. À bientôt à La Casbah.`,
    reminderSubject: (h) => `À demain ${h} — La Casbah`,
    reminderTitle: "Rappel : c'est demain",
    reminderBody: "Arrivez 10 minutes en avance. Maillot de bain et serviette sont les bienvenus, le reste est fourni.",
  },
  en: {
    hello: (n) => `Hello ${n},`,
    summary: (d, h, p, f, e) => `${d} at ${h} · ${p} guest(s) · ${f} · ${e}`,
    receivedSubject: "Your booking request at La Casbah",
    receivedTitle: "Request received",
    receivedBody: "We will confirm your slot within 2 hours.",
    confirmedSubject: (d, h) => `Booking confirmed — ${d} at ${h}`,
    confirmedTitle: "Booking confirmed",
    confirmedBody: (dep) => `A €${dep} deposit will be requested on site and deducted from your bill. Bring a swimsuit.`,
    cancelCta: "Cancel my booking",
    cancelByPhone: "To cancel, call us at least 24h in advance.",
    declinedSubject: "Slot unavailable — La Casbah",
    declinedTitle: "Slot unavailable",
    declinedBody: (d, h) => `Sorry, we cannot host you on ${d} at ${h}.`,
    declinedDefaultReason: "slot full",
    reasonLabel: "Reason:",
    rebookCta: "Pick another slot",
    cancelledSubject: "Booking cancelled — La Casbah",
    cancelledTitle: "Booking cancelled",
    cancelledBody: (d, h) => `Your booking on ${d} at ${h} is cancelled. See you soon at La Casbah.`,
    reminderSubject: (h) => `See you tomorrow at ${h} — La Casbah`,
    reminderTitle: "Reminder: it's tomorrow",
    reminderBody: "Please arrive 10 minutes early. Swimsuit and towel welcome, everything else is provided.",
  },
  ar: {
    hello: (n) => `مرحبًا ${n}،`,
    summary: (d, h, p, f, e) => `${d} الساعة ${h} · ${p} شخص · ${f} · ${e}`,
    receivedSubject: "طلب الحجز في لا كسبة",
    receivedTitle: "تم استلام طلبك",
    receivedBody: "سنؤكد موعدك خلال ساعتين.",
    confirmedSubject: (d, h) => `تم تأكيد الحجز — ${d} الساعة ${h}`,
    confirmedTitle: "تم تأكيد الحجز",
    confirmedBody: (dep) => `سيُطلب عربون ${dep} € في المكان ويُخصم من فاتورتك. لا تنسَ لباس السباحة.`,
    cancelCta: "إلغاء حجزي",
    cancelByPhone: "للإلغاء، اتصل بنا قبل 24 ساعة على الأقل.",
    declinedSubject: "الموعد غير متاح — لا كسبة",
    declinedTitle: "الموعد غير متاح",
    declinedBody: (d, h) => `نأسف، لا يمكننا استقبالك يوم ${d} الساعة ${h}.`,
    declinedDefaultReason: "الموعد ممتلئ",
    reasonLabel: "السبب:",
    rebookCta: "اختيار موعد آخر",
    cancelledSubject: "تم إلغاء الحجز — لا كسبة",
    cancelledTitle: "تم إلغاء الحجز",
    cancelledBody: (d, h) => `تم إلغاء حجزك ليوم ${d} الساعة ${h}. إلى اللقاء في لا كسبة.`,
    reminderSubject: (h) => `نراك غدًا الساعة ${h} — لا كسبة`,
    reminderTitle: "تذكير: موعدك غدًا",
    reminderBody: "يرجى الحضور قبل 10 دقائق. لباس السباحة والمنشفة مرحب بهما، والباقي متوفر.",
  },
};
