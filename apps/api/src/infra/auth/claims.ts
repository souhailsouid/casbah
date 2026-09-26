import { getAuth } from "firebase-admin/auth";

export type Role = "admin";

export interface CasbahClaims {
  role: Role;
  restaurantId: string;
}

/** Pose les custom claims (appelé par scripts/create-admin.ts). */
export async function setUserClaims(uid: string, claims: CasbahClaims): Promise<void> {
  await getAuth().setCustomUserClaims(uid, claims);
}

export function extractClaims(decoded: Record<string, unknown>): CasbahClaims | null {
  const role = decoded.role as Role | undefined;
  const restaurantId = decoded.restaurantId as string | undefined;
  if (role !== "admin" || !restaurantId) return null;
  return { role, restaurantId };
}
