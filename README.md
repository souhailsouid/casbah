# La Casbah — site, réservations et interface marchand

Hammam · spa · restaurant oriental à Roissy-en-Brie. Monorepo pnpm :

```
apps/web          site vitrine Next.js 15 (export statique) + interface marchand /admin
apps/api          API Fastify : réservations, notifications WhatsApp + e-mail, crons (Cloud Run)
packages/shared   types, schémas zod, règles de créneaux, machine à états
infra/            Terraform GCP : Cloud Run, Secret Manager, Scheduler, Firestore, WIF GitHub
docs/             PLAN-BACKEND-RESERVATIONS.md (architecture et phasage)
maquette/         maquette HTML d'origine
```

Site en ligne : **https://souhailsouid.github.io/casbah/** (déployé à chaque push sur `main`).

## Démarrer

```bash
pnpm install
pnpm build:shared            # à refaire après une modification de packages/shared
pnpm dev:web                 # http://localhost:3000  (mode démo tant que NEXT_PUBLIC_API_URL est vide)
pnpm dev:api                 # http://localhost:3001  (copier apps/api/.env.example → apps/api/.env)
pnpm emulators               # Firestore + Auth locaux (nécessite Java : brew install openjdk@21)
```

Sans clé Resend ni WhatsApp, l'API est en **mode console** : les messages sont écrits dans le journal au lieu d'être envoyés.

### Test de bout en bout

```bash
apps/api/scripts/smoke.sh
```

Lance les émulateurs et l'API, puis déroule : disponibilités → demande → idempotence → doublon → capacité → login admin → pile → confirmation → journal des notifications → annulation par lien → crons → webhook sans signature.

## Mettre le menu à jour

Tout le contenu du restaurant est dans `apps/web/data/menu.ts` (formule, sélection d'accueil, carte complète).
Le menu illustré est `apps/web/public/menu.jpg`. Les traductions EN/AR sont dans `apps/web/data/traductions.json`.

## Réservations : comment ça marche

1. Le visiteur choisit rituel, espace, personnes, jour, créneau (disponibilités et affluence **réelles** via `GET /availability`), puis nom, téléphone, opt-in WhatsApp, e-mail facultatif.
2. `POST /reservations` : validation zod, pot de miel, rate limit 5 / 10 min par IP, idempotence par UUID, anti-doublon, **transaction Firestore** sur la capacité du créneau.
3. Notifications (`notify(event, réservation)`) : client par WhatsApp (template Meta) si opt-in, sinon e-mail ; marchand par e-mail (+ WhatsApp si configuré). Chaque envoi est journalisé (`notifications/`), relancé 3 fois en cas d'échec, mis à jour par les webhooks de livraison.
4. Le marchand confirme ou refuse dans `/admin` (temps réel Firestore) → le client reçoit la confirmation avec lien d'annulation et `.ics`.
5. Crons Cloud Scheduler : rappel J-1, clôture des réservations passées, relance des envois échoués.

Détails, modèle de données et sécurité : [docs/PLAN-BACKEND-RESERVATIONS.md](docs/PLAN-BACKEND-RESERVATIONS.md).

## Mise en production (une fois)

1. **GCP** : créer le projet, activer Firebase Auth (e-mail/mot de passe) dans la console Firebase.
2. **Terraform** : `cd infra && cp terraform.tfvars.example terraform.tfvars`, créer le bucket d'état, `terraform init && terraform apply`. Les sorties donnent l'URL de l'API, les variables GitHub et les URL de webhooks.
3. **Secrets** : saisir les valeurs dans Secret Manager (`gcloud secrets versions add NOM --data-file=-`) : Resend, WhatsApp (token, phone number id, app secret, verify token), `CRON_SECRET`, `CANCEL_TOKEN_SECRET`.
4. **Firestore** : `firebase deploy --only firestore:rules --project <id>` (les index sont créés par Terraform).
5. **GitHub** : variables `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SA` (déploiement API) et `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_FIREBASE_*` (site + admin). Puis relancer les deux workflows.
6. **Compte marchand** : `pnpm -C apps/api create-admin <email> <mot-de-passe>` et `pnpm -C apps/api seed <email-notifications> [+33…]` (avec les identifiants GCP en local : `gcloud auth application-default login`).
7. **WhatsApp** : app Meta, numéro dédié, templates `casbah_*` (voir `apps/api/src/infra/notifications/templates.ts`) soumis à approbation, webhook `…/webhooks/whatsapp` avec le verify token.
8. **Resend** : domaine vérifié, webhook `…/webhooks/resend`.

### Publier en artifact Claude (optionnel)

```bash
pnpm -C apps/web build:artifact   # assets en chemins relatifs sous nx/ → out/artifact-files.json
```
