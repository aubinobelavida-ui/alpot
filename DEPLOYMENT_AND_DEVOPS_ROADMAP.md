# HELPot — Guide d'Hébergement & Feuille de Route DevOps (Vercel -> VPS)

Ce document formalise la stratégie d'infrastructure de **HELPot**, pensée pour concilier un **coût initial de 0 €** pendant la phase de développement/lancement, et une **transition fluide vers un VPS** lors de la montée en charge.

---

## Synthèse de la Stratégie Technique

```
┌────────────────────────────────────────────────────────────┐
│ ÉTAPE 1 : LANCEMENT & DÉVELOPPEMENT (COÛT : 0 € / MOIS)    │
│ • Hébergement Frontend & API : Vercel (Plan Hobby Gratuit) │
│ • Base de données : Turso libSQL (Plan Starter Gratuit)    │
│ • Stockage & Edge CDN : Inclus                             │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              ▼  (Quand les clients ajoutent leurs domaines)
┌────────────────────────────────────────────────────────────┐
│ ÉTAPE 2 : TRANSITION VPS HAUTE PERFORMANCE (~5 à 10 €/M.) │
│ • Serveur : Hetzner Cloud ou OVH (Serveur Dédié VPS)       │
│ • Orchestrateur : Coolify (PaaS auto-hébergé, clone Vercel)│
│ • Reverse Proxy : Caddy avec On-Demand TLS (SSL gratuit)   │
│ • Domaines illimités sans payer de supplément par domaine  │
└────────────────────────────────────────────────────────────┘
```

---

## PARTIE 1 : Démarrage Gratuit avec Vercel & Turso (Phase 1)

### 1. Pourquoi Turso pour la base de données ?
- **Technologie** : Turso repose sur *libSQL*, une version moderne et distribuée de SQLite.
- **Offre Gratuite généreuse (0 €/mois pour toujours)** :
  - Jusqu'à **9 Go** de stockage.
  - Jusqu'à **500 bases de données**.
  - **1 milliard de lectures de lignes / mois**.
  - Zéro mise en veille ("zero cold start") par rapport à d'autres solutions.
- **Portabilité totale** : Fonctionne aussi bien en serverless sur Vercel que sur votre machine locale ou sur un futur VPS.

### 2. Procédure de configuration Turso

1. **Créer un compte gratuit sur [turso.tech](https://turso.tech)**
2. **Installer la CLI Turso ou utiliser l'interface web** :
   ```bash
   # Sur Windows via PowerShell (optionnel) :
   irm https://get.turso.tech/install.ps1 | iex
   ```
3. **Créer une base de données pour HELPot** :
   ```bash
   turso auth login
   turso db create helpot-db --location cdg # cdg = Paris
   ```
4. **Récupérer l'URL et le Token** :
   ```bash
   turso db show helpot-db --url
   # Ex : libsql://helpot-db-votre-pseudo.turso.io

   turso db tokens create helpot-db
   # Génère une chaîne de token sécurisée
   ```

### 3. Déploiement sur Vercel (0 €)

1. **Pousser votre code sur votre dépôt GitHub privé**.
2. **Connecter le projet sur [vercel.com](https://vercel.com)** :
   - Importer le dépôt GitHub.
   - Détecter automatiquement le framework `Next.js`.
3. **Ajouter les variables d'environnement dans les paramètres Vercel** :
   - `TURSO_DATABASE_URL` = `libsql://helpot-db-votre-pseudo.turso.io`
   - `TURSO_AUTH_TOKEN` = `votre_token_secret_turso`
   - `JWT_SECRET` = `une_cle_secrete_aleatoire_de_votre_choix`
4. **Configurer votre nom de domaine principal (`helpot.fr`)** :
   - Dans Vercel > Settings > Domains :
     - Ajouter `helpot.fr`
     - Ajouter `*.helpot.fr` (pour les sous-domaines automatiques attribués aux clients).
   - Chez votre registrar de domaine (ex: OVH, Cloudflare, Namecheap) :
     - Pointer un enregistrement `CNAME` de `*.helpot.fr` vers `cname.vercel-dns.com`.

---

## PARTIE 2 : Transition vers un VPS dédié (Phase 2)

### 1. Pourquoi migrer vers un VPS par la suite ?
Vercel est parfait pour débuter, mais pose deux limites majeures à grande échelle pour une plateforme comme HELPot :
1. **Gestion des domaines personnalisés de vos clients** (`www.boulangerie-dupont.fr`) : Vercel facture son forfait Pro et applique des restrictions d'API sur le nombre de domaines clients connectés.
2. **Coût fixe vs variable** : Un VPS à 7 €/mois permet d'accueillir un trafic important et un nombre illimité de domaines sans aucune facture imprévue.

### 2. Le Serveur VPS Recommandé
- **Fournisseur n°1 conseillé : Hetzner Cloud**
  - Modèle **CPX21** (3 vCPU AMD, 4 Go RAM, 80 Go SSD NVMe) : **~7,50 € / mois**.
  - Localisation : Francfort ou Falkenstein (Europe, excellente latence).
- **Fournisseur alternatif : OVHcloud**
  - Modèle **VPS Starter / Value** : ~5 à 10 € / mois.

---

## PARTIE 3 : Architecture Technique sur le VPS

### 1. Utilisation de Coolify (Le Vercel auto-hébergé gratuit)
[Coolify](https://coolify.io) est un outil open-source gratuit qui s'installe en 1 commande sur votre VPS et transforme votre serveur en un clone privé de Vercel :
- Déploiements automatiques à chaque `git push`.
- Interface graphique moderne.
- Gestion automatique des conteneurs Docker.
- Surveillance des ressources (CPU, RAM).

**Installation sur le VPS** :
```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

### 2. Le secret pour les domaines personnalisés illimités : Caddy & On-Demand TLS
Le serveur web **Caddy** intègre une fonctionnalité révolutionnaire : **On-Demand TLS**.
Lorsqu'un de vos clients achète son propre nom de domaine et fait pointer son CNAME vers votre serveur, Caddy génère le certificat SSL Let's Encrypt **automatiquement en direct dès la première requête HTTP**, sans aucune intervention manuelle.

#### Exemple de configuration `Caddyfile` sur le VPS :
```caddy
{
    # Configuration On-Demand TLS
    on_demand_tls {
        ask http://127.0.0.1:3000/api/domains/verify
        interval 2m
        burst 5
    }
}

# Domaine principal et tous les sous-domaines clients
*.helpot.fr, helpot.fr {
    reverse_proxy 127.0.0.1:3000
}

# Capture tous les domaines personnalisés des clients
:443 {
    tls {
        on_demand
    }
    reverse_proxy 127.0.0.1:3000
}
```

---

## PARTIE 4 : Dockerfile Multi-Stage de Production

Ce fichier servira lors du passage sur le VPS pour packager HELPot de manière légère et ultra-sécurisée :

```dockerfile
# Étape 1 : Dépendances
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Étape 2 : Construction
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Étape 3 : Image de production légère
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

---

## Résumé des actions à suivre

1. **Aujourd'hui (Phase actuelle)** :
   - Conserver le code Next.js optimisé.
   - Utiliser Turso pour la base de données distante ou SQLite en local.
   - Déployer gratuitement sur Vercel avec l'URL et le Token Turso.
2. **Lorsque la plateforme génère ses premiers revenus** :
   - Commander un VPS Hetzner à ~7 €/mois.
   - Installer Coolify + Caddy en suivant ce guide.
   - Basculer les DNS de Vercel vers l'IP du VPS.
