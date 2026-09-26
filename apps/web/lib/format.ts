const NBSP = " ";

/** 15.9 → « 15,90 € » (espace insécable avant le symbole). */
export function prix(n: number): string {
  return n.toFixed(2).replace(".", ",") + NBSP + "€";
}

/** 49 → « 49 € » (montants ronds : forfaits, cartes cadeaux, acomptes). */
export function euros(n: number): string {
  return n + NBSP + "€";
}
