# La Casbah — site vitrine

Hammam · spa · restaurant oriental à Roissy-en-Brie. Site une page en **Next.js 15** (App Router, export statique), porté depuis la maquette HTML d'origine.

## Démarrer

```bash
cd casbah
pnpm install --ignore-workspace   # projet indépendant du monorepo adel-ai
pnpm dev                          # http://localhost:3000
pnpm build                        # génère le site statique dans out/
```

Le dossier `out/` se déploie tel quel (Vercel, Netlify, Caddy/Nginx…).

### Publier en ligne (artifact Claude)

Le site est publié en artifact : https://claude.ai/artifact/9UBFGJi3ohrTvMaaLCPQ82 (et l'ancien lien client https://claude.ai/artifact/F32nRqANrtLjx83EdBK62u pointe sur la même version).
L'hébergeur refuse les chemins commençant par `_` et ne résout pas les chemins absolus, d'où un build dédié :

```bash
pnpm build:artifact   # = ASSET_PREFIX=/nx next build && node scripts/prepare-artifact.mjs
```

Le script réécrit les chemins en relatif et génère `out/artifact-files.json` : la carte des fichiers
(`nx/_next/**` + `menu.jpg`) à publier avec `out/index.html`.

## Mettre le menu à jour

Tout le contenu du restaurant est dans **`data/menu.ts`** :

- `FORMULE` — bandeau « Formule déjeuner » (intitulé, détail, prix, supplément)
- `SPECIALITES_APERCU` — la sélection courte affichée sur la page d'accueil
- `CARTE` — la carte complète (tiroir « Voir toute la carte »), section par section

Un plat = `{ nom: "Tagine poulet", prix: 15.9, note?: "verre" }`. Le prix est un nombre (15.9 s'affiche « 15,90 € »).

Le **menu illustré** (photo du menu imprimé) est `public/menu.jpg` : remplacer le fichier suffit.

### Traductions EN / AR

Les libellés français sont traduits via `data/traductions.json` (`"texte français": ["english", "عربي"]`).
Un nouveau plat sans entrée dans ce fichier s'affiche simplement en français dans les autres langues.

## Autres contenus

- `data/site.ts` — forfaits hammam, températures, avis, montants des cartes cadeaux, coordonnées
- `components/Infos.tsx` — horaires
- `app/globals.css` — feuille de style (identique à la maquette)

## Structure

```
app/            layout (polices Google), page, globals.css
components/     Nav, Hero, Bains, Table, Offrir, Groupes, Avis, Infos, Footer,
                tiroirs (ResaDrawer, GiftDrawer, DevisDrawer, CarteDrawer), Effects (curseur, vapeur, reveals)
data/           menu.ts, site.ts, traductions.json
lib/            i18n (contexte FR/EN/AR), site-context (tiroirs), format (prix)
public/         menu.jpg
```

Les formulaires (réservation, carte cadeau, devis) sont des démos : rien n'est envoyé. Brancher Stripe / un e-mail est la prochaine étape.
