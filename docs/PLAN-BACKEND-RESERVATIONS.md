# La Casbah — Plan back-end : réservations, WhatsApp, interface marchand

_26 septembre 2026 — plan d'architecture. **Phases 0 à 3 réalisées le jour même** (voir « État d'avancement » ci-dessous) ; reste la mise en production (comptes GCP, Meta, Resend)._

## 0. État d'avancement

| Fait | Reste à faire (nécessite des comptes / le marchand) |
|---|---|
| Monorepo pnpm (`apps/web`, `apps/api`, `packages/shared`, `infra/`) | Créer le projet GCP et appliquer `infra/` (`terraform apply`) |
| API Fastify complète : disponibilités, création transactionnelle, annulation par lien HMAC, admin, webhooks signés, crons | Renseigner les secrets (Resend, WhatsApp, cron, jetons) |
| Notifications WhatsApp Cloud API + Resend/React Email, journal, relances, statuts de livraison | Compte Meta Business + numéro dédié + approbation des 7 templates `casbah_*` |
| Interface marchand `/admin` : login Firebase, pile temps réel, détail + journal, historique, réglages | Domaine vérifié chez Resend, compte marchand (`create-admin`) |
| Site branché sur l'API (mode démo tant que `NEXT_PUBLIC_API_URL` est vide), page `/annulation` | Variables GitHub (`NEXT_PUBLIC_*`, `GCP_*`) puis relance des workflows |
| Terraform validé, Dockerfile construit et testé, workflows GitHub (Pages + Cloud Run via WIF) | Recette avec le restaurant (capacités, horaires réels) |
| Tests unitaires (créneaux, machine à états, signatures) + scénario de bout en bout `apps/api/scripts/smoke.sh` sur émulateurs | Acompte Stripe (V2) |


## 1. Ce qu'on construit

Un seul parcours, de bout en bout :

1. Le visiteur réserve depuis le site (tiroir « Réserver » déjà en place : rituel, espace, personnes, jour, créneau, nom, téléphone).
2. Le client reçoit **sur WhatsApp** « demande reçue », puis « réservation confirmée » quand le marchand valide.
3. Le marchand voit la **pile des demandes** dans une interface admin, confirme ou refuse en un clic, et reçoit une alerte WhatsApp + e-mail à chaque nouvelle demande.
4. Un rappel WhatsApp part la veille ; le client peut annuler via un lien.

Tout le reste (acompte Stripe, cartes cadeaux, devis groupes, Google Reserve) est en V2, volontairement.

## 2. Décisions d'architecture

| Sujet | Décision | Pourquoi |
|---|---|---|
| Modèle | **Copier Flow**, pas Adel | Flow a exactement le bon gabarit : Fastify + Firestore + Firebase Auth + Resend + Terraform Cloud Run, sans Postgres ni workers. Adel est surdimensionné (Cloud SQL, BullMQ, VPS). |
| Base de données | **Firestore** | 4 collections, pas de jointures, temps réel natif pour la pile admin (`onSnapshot`), 0 € au repos, zéro ops. Même raisonnement que `~/flow/PLAN_FLOW_SAAS.md` §2.1. |
| API | **Fastify sur Cloud Run** (`min_instances = 0`) | Webhooks WhatsApp et Resend ont besoin d'une URL stable en HTTPS. Coût quasi nul. Terraform repris de `~/flow/infra/`. |
| Auth marchand | **Firebase Auth** (e-mail + mot de passe), custom claim `role: "admin"` + `restaurantId` | Réutilise `~/flow/apps/api/src/infra/auth/` (middleware, cache de tokens 5 min, `requireRole`). Aucun compte client : les clients agissent par **liens signés** (annulation), comme les tokens portail de Flow. |
| WhatsApp | **Meta WhatsApp Cloud API en direct** (pas de SDK, appels `fetch`) | Pas de marge Twilio, webhooks de statut de livraison inclus. Twilio reste l'option de repli si la vérification Meta Business traîne (voir §7). |
| E-mail | **Resend + React Email** | Copie de `~/flow/apps/api/src/infra/notifications/email.ts` et `emails/base-layout.tsx`. Canal de secours quand WhatsApp échoue ou sans opt-in, et canal principal pour le marchand. |
| Front | Un seul Next.js (`apps/web`) : site public + `/admin` (client-only) | Le site reste en export statique sur GitHub Pages. `/admin` est une page rendue côté client avec le SDK Firebase, ça marche en statique. Pas de second déploiement à gérer. |
| Repo | Passage en **monorepo pnpm** (`apps/web`, `apps/api`, `packages/shared`, `infra/`) | Même structure que Flow et Adel : types partagés (`Reservation`, statuts, zod schemas) entre API et front. |

## 3. Structure cible du dépôt

```
casbah/
├── apps/
│   ├── web/                 ← le site actuel (déplacé), + app/admin/*
│   └── api/                 ← Fastify (Cloud Run)
│       └── src/
│           ├── infra/auth/          firebase-admin.ts, auth-middleware.ts, claims.ts   (copiés de Flow)
│           ├── infra/firestore/     client.ts                                          (copié de Flow)
│           ├── infra/notifications/ notify.ts, email.ts, whatsapp.ts, log.ts
│           ├── emails/              base-layout.tsx, reservation-*.tsx
│           ├── domain/              slots.ts (capacité, horaires), reservation.ts (machine à états)
│           └── routes/              reservations.ts, admin.ts, webhooks.ts, cron.ts, health.ts
├── packages/shared/         ← types + schémas zod + constantes (statuts, horaires par défaut)
├── infra/                   ← Terraform : Cloud Run, Secret Manager, Scheduler, Firestore, Artifact Registry
└── .github/workflows/       ← deploy-pages.yml (web, existant) + deploy-api.yml (Cloud Run)
```

## 4. Modèle de données (Firestore)

```
restaurants/{restaurantId}                       ← un seul doc au début : "la-casbah"
  name, phone, whatsappNumberId, notifyEmail, timezone: "Europe/Paris"
  settings: {
    hours: { femmes: { tue: [10,22], default: [9,14.5] }, hommes: { default: [15,22], closed: ["tue"] } },
    capacityPerSlot: { femmes: 12, hommes: 12 },   ← personnes par créneau d'une heure
    slotMinutes: 60, bookingHorizonDays: 30, cancelDeadlineHours: 24
  }

  reservations/{reservationId}
    status: "pending" | "confirmed" | "declined" | "cancelled" | "no_show" | "completed"
    forfait: "entree" | "rituel" | "evasion", espace: "femmes" | "hommes"
    persons, date: "2026-10-03", hour: 15, priceTotal, depositDue
    customer: { name, phone (E.164), email?, whatsappOptIn: bool, locale: "fr"|"en"|"ar" }
    source: "web", idempotencyKey, createdAt, confirmedAt?, decidedBy?, notes?
    history: [{ at, from, to, by: "customer"|"admin:<uid>"|"system", reason? }]

  notifications/{notifId}                        ← journal de dispatch (idée reprise du dispatch log d'Adel)
    reservationId, channel: "whatsapp"|"email", template, to, status: "queued"|"sent"|"delivered"|"read"|"failed"
    providerMessageId, error?, attempts, createdAt, updatedAt

  slots/{date}_{espace}                          ← compteur dénormalisé pour l'affluence et la capacité
    counts: { "15": 6, "16": 11 }                ← personnes confirmées + en attente par heure

profiles/{uid}                                   ← marchand : email, role, restaurantId
```

Transactions Firestore pour créer une réservation : lecture de `slots/{date}_{espace}`, refus si `count + persons > capacityPerSlot`, écriture réservation + incrément du compteur dans la même transaction. C'est ce qui remplace l'affluence simulée du site par la vraie.

## 5. API (Fastify)

| Route | Auth | Rôle |
|---|---|---|
| `POST /reservations` | publique, rate-limitée | Créer une demande. Body validé par zod (`packages/shared`). Idempotence par `idempotencyKey` (UUID généré côté site). Déclenche `notify("reservation.received")`. |
| `GET /availability?espace&date` | publique | Créneaux ouverts + affluence réelle (remplace `affOf()` simulé dans `ResaDrawer.tsx`). |
| `GET /reservations/cancel/:token` / `POST …` | par token signé | Page d'annulation client (jusqu'à `cancelDeadlineHours` avant). |
| `GET /admin/reservations?status&from&to` | admin | Pile (pending d'abord), agenda du jour. |
| `POST /admin/reservations/:id/confirm` · `/decline` · `/no-show` | admin | Transitions d'état + notifications. |
| `GET/PUT /admin/settings` | admin | Horaires, capacités, e-mail de notification. |
| `GET /admin/reservations/:id/notifications` | admin | Journal des envois (pour répondre « il a reçu le WhatsApp ? »). |
| `POST /webhooks/whatsapp` + `GET` (challenge) | signature Meta | Statuts de livraison (sent/delivered/read/failed) et réponses texte du client. |
| `POST /webhooks/resend` | signature Svix | Bounces et échecs e-mail. |
| `POST /cron/reminders` · `/cron/complete-past` · `/cron/retry-notifications` | `x-cron-secret` + OIDC | Rappels J-1 à 10h, passage en `completed`, relance des envois `failed`. Cloud Scheduler, repris de `~/flow/infra/scheduler.tf`. |
| `GET /health` | publique | Cloud Run. |

Machine à états stricte dans `domain/reservation.ts` : seules transitions autorisées `pending → confirmed | declined | cancelled`, `confirmed → cancelled | no_show | completed`. Toute transition écrit une entrée `history` et déclenche les notifications correspondantes.

## 6. Notifications

Une seule fonction d'entrée, `notify(event, reservation)`, qui décide des canaux et écrit le journal :

| Événement | Client (WhatsApp si opt-in, sinon e-mail si fourni) | Marchand |
|---|---|---|
| `reservation.received` | « Demande reçue, réponse sous 2 h » | WhatsApp + e-mail « Nouvelle demande : … » avec lien direct vers `/admin` |
| `reservation.confirmed` | « Confirmée : ven. 3 oct. 15h, 2 pers., Rituel Signature. Annuler : lien » + pièce jointe `.ics` par e-mail | — |
| `reservation.declined` | « Désolé, créneau indisponible. Autres créneaux : lien » | — |
| `reservation.cancelled` (par le client) | accusé | WhatsApp « Annulation : … » |
| `reservation.reminder` (J-1) | « À demain 15h. Pensez au maillot. » | — |

Règles :
- **Jamais bloquant** : envoi fire-and-forget après la réponse HTTP, avec écriture `queued` dans `notifications/`, puis mise à jour par le résultat. Le cron `retry-notifications` relance les `failed` (3 tentatives max, backoff).
- **Idempotence** : une notification = `(reservationId, event, channel)`, on ne renvoie pas deux fois « confirmée ».
- **Langue** : les templates existent en FR/EN/AR, choisis d'après `customer.locale` (le site connaît déjà la langue).
- **WhatsApp** : hors fenêtre de 24 h, seuls des **templates approuvés par Meta** peuvent être envoyés (catégorie *utility* : `reservation_received`, `reservation_confirmed`, `reservation_declined`, `reservation_reminder`, `reservation_cancelled`). Dans la fenêtre de 24 h après un message du client, texte libre autorisé.
- **Opt-in** : case à cocher dans le tiroir « Recevoir la confirmation sur WhatsApp », stockée avec horodatage (obligation Meta + RGPD).
- **E-mail marchand** toujours envoyé, même quand WhatsApp fonctionne : c'est la trace qui reste.

## 7. WhatsApp : ce qu'il faut savoir avant de choisir

- **Meta Cloud API en direct** : gratuit côté API, facturation par message template (catégorie *utility*, de l'ordre de quelques centimes en France ; les réponses dans la fenêtre 24 h sont gratuites). Prérequis : un compte Meta Business vérifié, une app Meta, et **un numéro de téléphone qui n'est pas déjà utilisé sur l'application WhatsApp / WhatsApp Business**. Si le restaurant utilise déjà son numéro sur l'app, il faut soit migrer ce numéro vers l'API (il quitte l'app), soit prendre un numéro dédié. C'est la question à poser au marchand en premier.
- **Phase de dev** : Meta fournit un numéro de test gratuit (5 destinataires) : on développe tout sans attendre la vérification Business.
- **Approbation des templates** : quelques heures à quelques jours par template. À lancer dès la semaine 1 en parallèle du code.
- **Twilio (repli)** : sandbox immédiate, mêmes contraintes de templates, une marge par message en plus. Le code d'envoi est isolé dans `infra/notifications/whatsapp.ts` : changer de fournisseur ne touche que ce fichier.

## 8. Interface marchand (`/admin`)

Pages, toutes client-only, protégées par Firebase Auth + claim `admin` :

1. **Connexion** (`/admin/login`) : e-mail + mot de passe. Pas d'inscription publique : le compte est créé par script (`scripts/create-admin.ts`, comme Flow) et le claim posé côté serveur.
2. **Pile** (`/admin`) : les `pending` en haut avec deux boutons Confirmer / Refuser (raison optionnelle), puis l'agenda du jour et de demain, en temps réel via `onSnapshot`. Badge de compteur dans l'onglet. Notification navigateur optionnelle.
3. **Détail** d'une réservation : infos client, historique des états, journal des notifications avec statut de livraison WhatsApp (envoyé / reçu / lu), bouton « appeler », « marquer no-show ».
4. **Agenda** (`/admin/agenda`) : vue semaine par espace avec taux de remplissage par créneau.
5. **Réglages** (`/admin/settings`) : horaires par espace, capacité par créneau, jours de fermeture exceptionnels, e-mail et WhatsApp de notification.

Design : même charte (or, sable, Cormorant) mais utilitaire, densité type tableau de bord. Composants Radix déjà utilisés dans Flow (`dialog`, `tabs`, `select`), toasts `sonner`.

Règles Firestore (`firestore.rules`) : l'admin peut **lire** `restaurants/{id}/**` de son `restaurantId` (pour le temps réel) ; **toutes les écritures passent par l'API** (`allow write: if false`). Aucun accès public direct à Firestore.

## 9. Sécurité

- **Formulaire public** : validation zod stricte (téléphone normalisé en E.164 avec `libphonenumber-js`, date dans l'horizon de réservation, créneau dans les horaires), `@fastify/rate-limit` par IP (5 créations / 10 min) et par téléphone (3 demandes actives max), champ pot-de-miel, et **Cloudflare Turnstile** si du spam apparaît (gratuit, invisible).
- **Idempotence** : `idempotencyKey` UUID côté site, refus des doublons (même téléphone, même créneau, même jour).
- **Tokens** : le lien d'annulation porte `id` + `HMAC-SHA256(secret serveur, id)`. Rien n'est stocké, le jeton se recalcule pour chaque message (confirmation, rappel, relance) et se vérifie en temps constant.
- **Webhooks** : vérification `X-Hub-Signature-256` (HMAC app secret Meta) et signature Svix pour Resend. Rejet sinon, avec log.
- **API admin** : Bearer Firebase ID token vérifié via `firebase-admin` (cache 5 min copié de Flow), `requireRole("admin")`, contrôle que `restaurantId` du claim correspond à la ressource.
- **CORS** : origine unique du site (`https://souhailsouid.github.io` puis le domaine final). Cloud Run en `allUsers` mais l'auth est applicative, comme Flow.
- **Secrets** : Secret Manager via Terraform (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `CRON_SECRET`). Rien dans le repo (`~/flow` a deux clés de service account committées à la racine : à ne pas reproduire).
- **Journal** : chaque transition d'état porte `by` et `at`. Chaque envoi est tracé. C'est ce qui permet de répondre à une réclamation.
- **RGPD** : mention sous le formulaire, opt-in WhatsApp explicite, cron de purge des coordonnées 12 mois après la visite, export/suppression sur demande (route admin).
- **En-têtes** : `@fastify/helmet` sur l'API ; le site statique garde ceux de GitHub Pages.

## 10. Infra et déploiement

- **GCP** : nouveau projet `casbah-prod` (isolation de facturation et d'IAM vis-à-vis d'Adel et Flow), Firestore natif région `europe-west1`, Firebase Auth activé.
- **Terraform** (`infra/`), copié de Flow en changeant les noms : `main.tf`, `cloud-run-api.tf`, `secrets.tf`, `scheduler.tf` (3 jobs), `firestore.tf`, `registry.tf`. Pas de bucket GCS (pas de fichiers). Pas de Cloud Run web : le site reste sur GitHub Pages.
- **CI** : `deploy-api.yml` (build Docker multi-stage → Artifact Registry → `gcloud run deploy`), déclenché sur `apps/api/**` et `packages/shared/**`. Auth GitHub → GCP par Workload Identity Federation (pas de clé JSON dans les secrets GitHub).
- **Coût mensuel estimé** : Cloud Run ~0-3 €, Firestore 0 €, Firebase Auth 0 €, Resend 0 € (3 000 e-mails/mois offerts), WhatsApp quelques euros pour ~200 réservations, Secret Manager < 1 €.
- **Domaine** : quand le client prend un nom de domaine, `api.<domaine>` en mapping Cloud Run et le site en `CNAME` GitHub Pages (le `basePath` disparaît).

## 11. Phasage

| Phase | Contenu | Durée |
|---|---|---|
| **0 — Socle** | Monorepo pnpm, `apps/api` scaffold (copie Flow), projet GCP + Terraform appliqué, CI API, compte Resend, app Meta + numéro de test. Lancer la vérification Meta Business et les 5 templates. | 1 jour |
| **1 — Réservation** | Modèle Firestore, `POST /reservations` avec transaction de capacité, `GET /availability`, notifications e-mail + WhatsApp (numéro de test), branchement du tiroir du site (remplace la démo), page d'annulation par lien. | 2-3 jours |
| **2 — Admin** | Login, pile temps réel, confirmer / refuser, détail + journal, réglages horaires et capacité, script de création du compte marchand. | 2-3 jours |
| **3 — Fiabilité** | Cron rappels J-1 et retry, webhooks statuts WhatsApp / Resend, `.ics`, Turnstile si besoin, purge RGPD, tests d'intégration (émulateur Firestore + Resend en mode test). | 1-2 jours |
| **Mise en prod** | Numéro WhatsApp définitif, templates approuvés, compte marchand, recette avec le restaurant. | 0,5 jour + délai Meta |
| **V2** | Acompte Stripe 10 €/pers. (l'UI existe déjà), cartes cadeaux, devis groupes, multi-établissements. | plus tard |

## 12. Ce qu'on reprend tel quel

| De | Fichier | Usage |
|---|---|---|
| Flow | `apps/api/src/infra/auth/{firebase-admin,auth-middleware,claims}.ts` | Auth + rôles |
| Flow | `apps/api/src/infra/firestore/client.ts` | Client Firestore |
| Flow | `apps/api/src/infra/notifications/email.ts`, `emails/base-layout.tsx` | Resend + React Email |
| Flow | `infra/*.tf`, `.github/workflows/deploy.yml`, `Dockerfile` API | Cloud Run + Secret Manager + Scheduler |
| Flow | `routes/cron.ts` (secret + OIDC) | Jobs planifiés |
| Adel | `notification_dispatch_log` (idée) | Journal de dispatch par (réservation, événement, canal) |
| Adel | `@fastify/rate-limit`, `fastify-type-provider-zod` | Validation et limitation |

## 13. Questions à trancher avec le marchand

1. Le numéro WhatsApp du restaurant est-il déjà sur l'app WhatsApp Business ? (détermine numéro dédié ou migration)
2. Qui confirme les réservations, à quelle vitesse ? (dimensionne le « sous 2 h » promis au client)
3. Capacité réelle par créneau et par espace, et jours de fermeture.
4. Acompte obligatoire dès la V1 ou plus tard ? (Stripe = +1 jour et un compte Stripe au nom du restaurant)
5. E-mail du restaurant pour les notifications, et nom d'expéditeur (`La Casbah <reservations@…>` demande un domaine vérifié chez Resend).
