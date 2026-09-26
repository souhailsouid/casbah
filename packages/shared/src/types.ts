export type ForfaitId = "entree" | "rituel" | "evasion";
export type Espace = "femmes" | "hommes";
export type Locale = "fr" | "en" | "ar";

export type ReservationStatus = "pending" | "confirmed" | "declined" | "cancelled" | "no_show" | "completed";

export type Actor = "customer" | "system" | `admin:${string}`;

export interface ReservationHistoryEntry {
  at: string; // ISO
  from: ReservationStatus | null;
  to: ReservationStatus;
  by: Actor;
  reason?: string;
}

export interface Customer {
  name: string;
  phone: string; // E.164
  email?: string;
  whatsappOptIn: boolean;
  whatsappOptInAt?: string;
  locale: Locale;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  status: ReservationStatus;
  forfait: ForfaitId;
  espace: Espace;
  persons: number;
  date: string; // YYYY-MM-DD (fuseau de l'établissement)
  hour: number; // 15 = 15h00
  priceTotal: number;
  depositDue: number;
  customer: Customer;
  notes?: string;
  source: "web" | "admin" | "phone";
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  decidedBy?: string;
  history: ReservationHistoryEntry[];
}

export type NotificationChannel = "whatsapp" | "email";
export type NotificationEvent =
  | "reservation.received"
  | "reservation.confirmed"
  | "reservation.declined"
  | "reservation.cancelled"
  | "reservation.reminder";
export type NotificationStatus = "queued" | "sent" | "delivered" | "read" | "failed" | "skipped";

export interface NotificationLog {
  id: string;
  reservationId: string;
  event: NotificationEvent;
  channel: NotificationChannel;
  audience: "customer" | "merchant";
  to: string;
  template: string;
  status: NotificationStatus;
  providerMessageId?: string;
  error?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface OpeningHours {
  /** [première heure, dernier créneau] (heures décimales, ex. 14.5 = 14h30) */
  default: [number, number];
  byDay: Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, [number, number]>>;
  closedDays?: number[];
}

export interface RestaurantSettings {
  timezone: string;
  slotMinutes: number;
  bookingHorizonDays: number;
  cancelDeadlineHours: number;
  maxPersonsPerBooking: number;
  capacityPerSlot: Record<Espace, number>;
  hours: Record<Espace, OpeningHours>;
  /** Fermetures exceptionnelles, YYYY-MM-DD */
  closedDates: string[];
}

export interface Restaurant {
  id: string;
  name: string;
  phone?: string;
  notifyEmail: string;
  notifyWhatsapp?: string; // E.164 du marchand
  settings: RestaurantSettings;
  createdAt: string;
}

/** Compteur dénormalisé par jour et espace : persons réservées (pending + confirmed) par heure. */
export interface SlotCounter {
  date: string;
  espace: Espace;
  counts: Record<string, number>;
  updatedAt: string;
}

export interface Profile {
  uid: string;
  email: string;
  role: "admin";
  restaurantId: string;
  createdAt: string;
}

export type Affluence = 0 | 1 | 2; // calme, modéré, chargé

export interface AvailabilitySlot {
  hour: number;
  remaining: number;
  affluence: Affluence;
}

export interface AvailabilityDay {
  date: string;
  closed: boolean;
  slots: AvailabilitySlot[];
}
