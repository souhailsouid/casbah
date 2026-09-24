/**
 * LA CARTE DU RESTAURANT — fichier à modifier pour mettre le menu à jour.
 *
 * Chaque plat : { nom, prix, note? }
 *   - nom  : libellé affiché (en français ; les traductions EN/AR sont dans data/traductions.json)
 *   - prix : nombre en euros (15.9 s'affiche « 15,90 € »)
 *   - note : précision facultative affichée en italique (ex. « verre », « 4 pièces »)
 *
 * Source : menu imprimé « Voyage des saveurs d'Orient » (version septembre 2026).
 */

export type MenuItem = { nom: string; prix: number; note?: string };
export type MenuSection = {
  id: string;
  titre: string;
  sousTitre?: string;
  items: MenuItem[];
  note?: string;
};

/** Formule déjeuner (bandeau de la section « La Table » + carte complète). */
export const FORMULE = {
  titre: "FORMULE DÉJEUNER · LUN – VEN",
  detail: "Plat au choix + café ou thé gourmand",
  prix: 18.9,
  supplement: "Supplément de 2,00 € pour les plats à base d'agneau",
};

/** Sélection courte affichée sur la page d'accueil (section « La Table »). */
export const SPECIALITES_APERCU: MenuItem[] = [
  { nom: "Tagine d'agneau aux pruneaux et amandes", prix: 19.9 },
  { nom: "Tagine poulet", prix: 15.9 },
  { nom: "Tagine kefta", prix: 16.9 },
  { nom: "Tagine végétarien", prix: 14.9 },
  { nom: "Couscous royal", prix: 19.9, note: "— le vendredi" },
  { nom: "Assiette mixte", prix: 21.9 },
  { nom: "Café ou thé gourmand", prix: 4.9 },
];

/** Carte complète (tiroir « Voir toute la carte »). */
export const CARTE: MenuSection[] = [
  {
    id: "brochettes",
    titre: "NOS ASSIETTES DE BROCHETTES",
    sousTitre: "servies avec slata méchouia, salade tunisienne et au choix frites ou riz",
    items: [
      { nom: "Assiette de brochettes de poulet marinés", prix: 15.9 },
      { nom: "Assiette merguez", prix: 15.9 },
      { nom: "Assiette côtelette d'agneau", prix: 19.9 },
      { nom: "Assiette de brochettes kefta", prix: 16.9 },
      { nom: "Assiette mixte", prix: 21.9 },
    ],
  },
  {
    id: "specialites",
    titre: "NOS SPÉCIALITÉS",
    items: [
      { nom: "Tagine d'agneau aux pruneaux et amandes", prix: 19.9 },
      { nom: "Tagine poulet", prix: 15.9 },
      { nom: "Tagine kefta", prix: 16.9 },
      { nom: "Tagine végétarien", prix: 14.9 },
    ],
  },
  {
    id: "couscous",
    titre: "COUSCOUS",
    sousTitre: "uniquement le vendredi",
    items: [
      { nom: "Couscous royal", prix: 19.9 },
      { nom: "Couscous végétarien", prix: 14.9 },
    ],
  },
  {
    id: "entrees-froides",
    titre: "ENTRÉES FROIDES",
    items: [
      { nom: "Slata méchouia", prix: 4.9 },
      { nom: "Salade tunisienne", prix: 4.9 },
    ],
  },
  {
    id: "entrees-chaudes",
    titre: "ENTRÉES CHAUDES",
    items: [
      { nom: "Chorba", prix: 5.9 },
      { nom: "Brick tunisienne", prix: 5.9 },
      { nom: "Brick cigare", prix: 5.9, note: "viande hachée ou fromage · 4 pièces" },
    ],
  },
  {
    id: "desserts",
    titre: "DESSERTS",
    items: [
      { nom: "Assortiment de 2 pâtisseries orientales", prix: 3 },
      { nom: "Café ou thé gourmand", prix: 4.9, note: "café ou thé avec assortiment de 3 pâtisseries" },
    ],
  },
  {
    id: "boissons",
    titre: "BOISSONS",
    items: [
      { nom: "Eau plate", prix: 2, note: "50 cl" },
      { nom: "Eau gazeuse", prix: 2.5, note: "50 cl" },
      { nom: "Citronnade maison", prix: 2.9, note: "verre" },
      { nom: "Thé à la menthe", prix: 1, note: "verre" },
      { nom: "Café", prix: 2, note: "expresso ou allongé" },
    ],
  },
];
