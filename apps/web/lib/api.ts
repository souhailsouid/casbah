import type { AvailabilityDay, CreateReservationInput } from "@casbah/shared";

/** URL de l'API (NEXT_PUBLIC_API_URL). Absente = le site reste en mode démo (réservations simulées). */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const isApiConfigured = () => API_URL.length > 0;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(init?.headers as Record<string, string>) },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    throw new ApiError(body.error ?? `Erreur ${res.status}`, res.status, body.code);
  }
  return res.json() as Promise<T>;
}

export function fetchAvailability(espace: "femmes" | "hommes", days = 12) {
  return request<{ espace: string; maxPersons: number; days: AvailabilityDay[] }>(`/availability?espace=${espace}&days=${days}`);
}

export function createReservation(body: CreateReservationInput) {
  return request<{ id: string; status: string; depositDue: number; priceTotal: number }>("/reservations", { method: "POST", body: JSON.stringify(body) });
}

export interface CancelInfo {
  id: string;
  status: string;
  date: string;
  hour: number;
  persons: number;
  forfait: string;
  espace: "femmes" | "hommes";
  name: string;
  canCancel: boolean;
  cancelDeadlineHours: number;
}

export function getCancelInfo(id: string, token: string) {
  return request<CancelInfo>(`/reservations/${encodeURIComponent(id)}/cancel/${encodeURIComponent(token)}`);
}

export function cancelReservation(id: string, token: string) {
  return request<{ id: string; status: string }>(`/reservations/${encodeURIComponent(id)}/cancel/${encodeURIComponent(token)}`, { method: "POST" });
}
