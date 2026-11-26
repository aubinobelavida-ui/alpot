# HELPot — Marketplace de Templates Web & Studio No-Code

Plateforme professionnelle unifiée combinant :
1. **Marketplace Publique** : Découverte sectorielle, captures d'écrans multi-pages, panier réactif et tunnel de commande sécurisé.
2. **Espace Client Multi-Tenant** : Gestion multi-sites étanches, chaque achat provisionnant une instance indépendante via deep-cloning.
3. **Studio d'Édition Visuelle No-Code** : Éditeur 3 panneaux (Structure & widgets à gauche, Canvas interactif au centre avec bascule Desktop/Tablette/Mobile, Inspecteur de propriétés à droite, autosave et historique undo/redo).
4. **Moteur de Publication & Rendu Dynamique** : Attribution de sous-domaine offert (`nomdusite.helpot.fr` ou `/sites/[slug]`), validation pré-publication et releases immuables.
5. **Back-Office Administrateur** : Supervision des ventes, catalogue de templates, catégories et gestion des clients.

---

## Comptes de Démonstration Préconfigurés

- **Client Démo** :
  - Email : `demo@helpot.com`
  - Mot de passe : `demo123456` (ou `password`)
  - Dispose déjà d'un site prêt à personnaliser dans son espace client !
- **Administrateur HELPot** :
  - Email : `admin@helpot.com`
  - Mot de passe : `admin123456` (ou `password`)
  - Accès au back-office `/admin`.

---

## Démarrage Rapide

```bash
# Installation des dépendances
npm install

# Lancement en mode développement
npm run dev

# Construction et lancement en production
npm run build
npm start
```

L'application est accessible à l'adresse [http://localhost:3000](http://localhost:3000).

---

## Routes Principales

- `/` : Page d'accueil de la marketplace avec recherche et filtrage par métiers.
- `/templates/:id` : Fiche détaillée d'un template avec galerie de captures d'écran et zoom lightbox.
- `/cart` : Panier d'achat avec calcul de remise (code promo : `WELCOME10` ou `HELPOT20`).
- `/checkout` : Tunnel de commande avec création de compte automatique et paiement sécurisé.
- `/dashboard` : Espace client avec tableau de bord et liste des sites acquis.
- `/dashboard/sites/:id` : Paramètres d'un site (nom, sous-domaine, couleurs, SEO, catalogue de données).
- `/editor/:siteId` : Studio d'édition visuelle WYSIWYG en temps réel.
- `/sites/:slug` : Rendu public d'un site publié.
- `/admin` : Back-office de supervision HELPot.
- `/login` : Connexion et inscription avec boutons de remplissage rapide démo.
