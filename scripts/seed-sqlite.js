const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'helpot.db');
const db = new DatabaseSync(dbPath);

console.log('--- Reseeding 5 New E-commerce Templates in local SQLite ---');

const insertTpl = db.prepare(`
  INSERT OR REPLACE INTO templates (id, name, slug, headline, description, price, category_id, sub_category_id, type, thumbnail_url, features_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertScr = db.prepare(`
  INSERT OR REPLACE INTO template_screenshots (id, template_id, page_name, image_url, sort_order)
  VALUES (?, ?, ?, ?, ?)
`);

const insertBlueprint = db.prepare(`
  INSERT OR REPLACE INTO template_blueprint_pages (id, template_id, slug, title, is_home, sort_order, sections_json)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const newTemplates = [
  {
    id: 'tpl-shopelios-energy',
    name: 'Shopelios — Énergie, Pellets de Bois & Poêles',
    slug: 'shopelios-energie-bois-pellets',
    headline: 'Vente en ligne de granulés de bois, combustibles écologiques et poêles à haute efficacité.',
    description: 'Inspiré des plus grandes boutiques de chauffage durable. Idéal pour distributeurs de granulés, bûches compressées et poêles. Inclut le calcul de livraison par palette avec déchargement au transpalette et gestion des stocks en temps réel.',
    price: 269.00,
    category_id: 'ecommerce',
    sub_category_id: 'mobilier',
    type: 'ECOMMERCE',
    thumbnail_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    features: [
      'Calculateur de livraison par palette et code postal',
      'Fiche technique détaillée (pouvoir calorifique, humidité, taux de cendres)',
      'Sélecteur de quantité par palette ou à la tonne',
      'Badges labels de qualité DINplus et ENplus A1',
      'Paiement en plusieurs fois et devis pro'
    ],
    screenshots: [
      { page_name: 'Accueil Chauffage & Énergie', image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80', sort_order: 1 },
      { page_name: 'Catalogue Pellets & Granulés', image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80', sort_order: 2 },
      { page_name: 'Fiche Palette DINplus', image_url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=80', sort_order: 3 },
      { page_name: 'Panier d’Achat & Livraison', image_url: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1200&q=80', sort_order: 4 },
      { page_name: 'Paiement Sécurisé', image_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80', sort_order: 5 }
    ]
  },
  {
    id: 'tpl-topgart-garden',
    name: 'TopGart — Jardin, Motoculture & Outillage d’Extérieur',
    slug: 'topgart-jardin-motoculture',
    headline: 'Équipements d’extérieur robustes, tondeuses, tronçonneuses et outillage professionnel.',
    description: 'L’univers de référence pour les revendeurs de matériel de jardinage, motoculture et entretien d’espaces verts. Présentation percutante des garanties, pièces détachées et comparateur de motorisations.',
    price: 259.00,
    category_id: 'ecommerce',
    sub_category_id: 'mobilier',
    type: 'ECOMMERCE',
    thumbnail_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
    features: [
      'Filtres par type de motorisation (thermique, batterie, électrique)',
      'Mise en avant de la garantie constructeur 2 à 5 ans',
      'Catalogue de pièces détachées et vues éclatées',
      'Conseils d’entretien saisonnier et guides d’hivernage',
      'Module d’expédition volumineuse pour tondeuses autoportées'
    ],
    screenshots: [
      { page_name: 'Accueil Outillage & Jardin', image_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80', sort_order: 1 },
      { page_name: 'Rayon Tondeuses & Autoportées', image_url: 'https://images.unsplash.com/photo-1558904541-efa8c4a08931?auto=format&fit=crop&w=1200&q=80', sort_order: 2 },
      { page_name: 'Fiche Tronçonneuse Thermique', image_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=80', sort_order: 3 },
      { page_name: 'Espace Pièces Détachées', image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80', sort_order: 4 },
      { page_name: 'Validation de Commande', image_url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1200&q=80', sort_order: 5 }
    ]
  },
  {
    id: 'tpl-lenha-design',
    name: 'Lenha — Poêles Scandinaves Contemporains & Cheminées',
    slug: 'lenha-poeles-scandinaves-design',
    headline: 'Élégance nordique, flamme majestueuse et rendement énergétique d’exception.',
    description: 'Spécifiquement conçu pour les cheministes, installateurs de poêles scandinaves et marques haut de gamme. Intègre simulateur de puissance en kW, visuels immersifs et demandes d’étude thermique préalable.',
    price: 279.00,
    category_id: 'ecommerce',
    sub_category_id: 'mobilier',
    type: 'ECOMMERCE',
    thumbnail_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    features: [
      'Design épuré scandinave et photographies en ambiance cosy',
      'Calculateur de surface et puissance en kW requise',
      'Badges éco-conception Flamme Verte 7 étoiles',
      'Formulaire de visite technique et raccordement au conduit',
      'Boutique d’accessoires (serviteurs, pare-feu, paniers à bûches)'
    ],
    screenshots: [
      { page_name: 'Accueil Galerie Scandinave', image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80', sort_order: 1 },
      { page_name: 'Catalogue Poêles à Granulés', image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80', sort_order: 2 },
      { page_name: 'Fiche Poêle Oslo Haute Finition', image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80', sort_order: 3 },
      { page_name: 'Simulateur d’Aides MaPrimeRénov', image_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80', sort_order: 4 }
    ]
  },
  {
    id: 'tpl-gamingbm-esport',
    name: 'GamingBM — PC Gamer, Setups Esport & Hardware',
    slug: 'gamingbm-pc-gamer-esport-hardware',
    headline: 'L’univers gaming par excellence : setups cyberpunk, hardware puissant et accessoires pro.',
    description: 'Une identité visuelle dark mode percutante avec néons bleus/violets. Optimisé pour la vente de tours gaming assemblées, cartes graphiques, claviers mécaniques RGB, écrans 240Hz et fauteuils gaming.',
    price: 289.00,
    category_id: 'ecommerce',
    sub_category_id: 'electronique',
    type: 'ECOMMERCE',
    thumbnail_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80',
    features: [
      'Thème sombre immersif (Dark Mode) avec accents néons',
      'Tableau d’indicateurs de FPS par jeu (Fortnite, Warzone, Cyberpunk)',
      'Fiche technique détaillée (CPU, GPU, RAM, Watercooling)',
      'Badges Garantie zéro pixel mort et composants testés',
      'Panier slide-over et configurateur interactif'
    ],
    screenshots: [
      { page_name: 'Accueil Cyber & PC Gamer', image_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80', sort_order: 1 },
      { page_name: 'Rayon Tours Gamer Prêtes à Jouer', image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80', sort_order: 2 },
      { page_name: 'Fiche PC Gamer RTX 4080', image_url: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1200&q=80', sort_order: 3 },
      { page_name: 'Rayon Périphériques & Claviers', image_url: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=1200&q=80', sort_order: 4 },
      { page_name: 'Panier Rapide & Checkout', image_url: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1200&q=80', sort_order: 5 }
    ]
  },
  {
    id: 'tpl-hlg-appliances',
    name: 'HLG — Électroménager Haut de Gamme & Maison',
    slug: 'hlg-electromenager-maison-pro',
    headline: 'Fiabilité, sobriété et performance pour les équipements électroménagers du foyer.',
    description: 'Boutique moderne et fonctionnelle axée sur la clarté et la confiance. Présentation soignée des classes énergétiques, des dimensions d’encastrement et des options d’extension de garantie.',
    price: 249.00,
    category_id: 'ecommerce',
    sub_category_id: 'electronique',
    type: 'ECOMMERCE',
    thumbnail_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
    features: [
      'Affichage des étiquettes énergie et indice de réparabilité',
      'Filtres par dimensions (largeur, hauteur, pose libre ou intégrable)',
      'Option reprise de l’ancien appareil et mise en service à domicile',
      'Avis clients vérifiés et comparateur de fiches techniques',
      'Livraison sur rendez-vous avec créneau de 2h'
    ],
    screenshots: [
      { page_name: 'Accueil Électroménager & Cuisine', image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80', sort_order: 1 },
      { page_name: 'Rayon Fours & Cuisson', image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80', sort_order: 2 },
      { page_name: 'Fiche Réfrigérateur Connecté', image_url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=1200&q=80', sort_order: 3 },
      { page_name: 'Panier & Forfait Installation', image_url: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1200&q=80', sort_order: 4 }
    ]
  }
];

for (const t of newTemplates) {
  insertTpl.run(
    t.id,
    t.name,
    t.slug,
    t.headline,
    t.description,
    t.price,
    t.category_id,
    t.sub_category_id,
    t.type,
    t.thumbnail_url,
    JSON.stringify(t.features)
  );

  let sOrder = 1;
  for (const s of t.screenshots) {
    insertScr.run(`scr-${t.id}-${sOrder}`, t.id, s.page_name, s.image_url, s.sort_order);
    sOrder++;
  }
}

const totalTpl = db.prepare('SELECT count(*) as count FROM templates').get();
console.log(`✓ Total des templates enregistrés dans helpot.db : ${totalTpl.count}`);
