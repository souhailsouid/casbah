"use client";

import type { NotificationLog, Reservation, Restaurant } from "@casbah/shared";
import { API_URL, ApiError } from "./api";
import { getFirebaseAuth } from "./firebase-client";

/** Appel API authentifié (ID token Firebase en Bearer). Repris du wrapper de Flow. */
export async function adminFetch<T>(path: string, init?: RequestInit & { forceTokenRefresh?: boolean }): Promise<T> {
  const user = getFirebaseAuth().currentUser;
  const token = user ? await user.getIdToken(init?.forceTokenRefresh ?? false) : null;
  const { forceTokenRefresh: _f, headers, ...rest } = init ?? {};
  const res = await fetch(`${API_URL}/admin${path}`, {
    ...rest,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...(headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    throw new ApiError(body.error ?? `Erreur ${res.status}`, res.status, body.code);
  }
  return res.json() as Promise<T>;
}

export const adminApi = {
  me: () => adminFetch<{ uid: string; email?: string; restaurantId?: string }>("/me"),
  inbox: () => adminFetch<{ today: string; pending: Reservation[]; upcoming: Reservation[] }>("/inbox"),
  list: (q: string) => adminFetch<{ items: Reservation[] }>(`/reservations?${q}`),
  get: (id: string) => adminFetch<{ reservation: Reservation; notifications: NotificationLog[] }>(`/reservations/${id}`),
  confirm: (id: string) => adminFetch<{ reservation: Reservation }>(`/reservations/${id}/confirm`, { method: "POST", body: "{}" }),
  decline: (id: string, reason?: string) => adminFetch<{ reservation: Reservation }>(`/reservations/${id}/decline`, { method: "POST", body: JSON.stringify({ reason }) }),
  cancel: (id: string, reason?: string) => adminFetch<{ reservation: Reservation }>(`/reservations/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }),
  noShow: (id: string) => adminFetch<{ reservation: Reservation }>(`/reservations/${id}/no-show`, { method: "POST", body: "{}" }),
  restaurant: () => adminFetch<Restaurant>("/restaurant"),
  updateRestaurant: (patch: Partial<Restaurant>) => adminFetch<Restaurant>("/restaurant", { method: "PUT", body: JSON.stringify(patch) }),
};
