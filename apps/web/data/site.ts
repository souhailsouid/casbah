/**
 * Contenu éditorial du site (hors carte du restaurant → voir data/menu.ts).
 * Les prix des bains, horaires et avis sont ceux de la maquette : à valider avec l'établissement.
 */

export type ForfaitId = "entree" | "rituel" | "evasion";

export const FORFAITS: {
  id: ForfaitId;
  num: string;
  nom: string;
  titre: [string, string];
  prix: number;
  duree: string;
  inclus: string[];
  star?: boolean;
}[] = [
  {
    id: "entree",
    num: "N° I",
    nom: "L'Entrée aux Bains",
    titre: ["L'Entrée", "aux Bains"],
    prix: 25,
    duree: "2H",
    inclus: ["Hammam, sauna & bain froid", "Accès libre 2 heures", "Thé à la menthe offert"],
  },
  {
    id: "rituel",
    num: "N° II",
    nom: "Le Rituel Signature",
    titre: ["Le Rituel", "Signature"],
    prix: 39,
    duree: "2H30",
    inclus: ["Les Bains au complet", "Gommage au savon noir", "Gant kessa traditionnel"],
    star: true,
  },
  {
    id: "evasion",
    num: "N° III",
    nom: "L'Évasion Complète",
    titre: ["L'Évasion", "Complète"],
    prix: 49,
    duree: "3H",
    inclus: ["Le Rituel Signature", "Plat au choix au restaurant", "Thé & pâtisserie orientale"],
  },
];

export const TEMPERATURES = [
  { valeur: 50, label: "HAMMAM", detail: "Chaleur humide · 90 % d'humidité" },
  { valeur: 80, label: "SAUNA", detail: "Chaleur sèche · 10 % d'humidité" },
  { valeur: 5, label: "BAIN FROID", detail: "Fraîcheur intense · immersion" },
];

export const MARQUEE = [
  "HAMMAM 50°",
  "SAUNA 80°",
  "BAIN FROID 5°",
  "GOMMAGE AU SAVON NOIR",
  "TAJINES & GRILLADES",
  "THÉ À LA MENTHE",
];

export const MONTANTS_CADEAU = [39, 49, 75, 100];
export const ACOMPTE_PAR_PERSONNE = 10;

export const AVIS = [
  { texte: "« Le gommage, puis le tajine encore fumant… on ne trouve ça nulle part ailleurs. »", auteur: "— SARAH · AVIS GOOGLE" },
  { texte: "« Propre, chaleureux, une vraie parenthèse à vingt minutes de chez moi. »", auteur: "— KARIM · AVIS GOOGLE" },
  { texte: "« On est venues à huit pour un EVJF — hammam privatisé et la table d'à côté. Parfait. »", auteur: "— LINA · AVIS GOOGLE" },
];

export const CONTACT = {
  adresse: "[ADRESSE]",
  ville: "77680 Roissy-en-Brie",
  telephone: "[TÉLÉPHONE]",
};
