const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'helpot.db');
const db = new DatabaseSync(dbPath);

console.log('--- Reseeding 11 Evocative Templates & Blueprints in local SQLite ---');

const updateTpl = db.prepare(`
  UPDATE templates 
  SET name = ?, headline = ?, description = ?
  WHERE id = ?
`);

const templatesUpdates = [
  {
    id: 'tpl-gamingbm-esport',
    name: 'AURA — Gaming',
    headline: 'L’univers gaming d’élite : setups esport cyberpunk, hardware surpuissant et périphériques de précision.',
    description: 'Une identité visuelle dark mode percutante avec néons bleus/violets. Optimisé pour la vente de tours gaming assemblées, cartes graphiques RTX, claviers mécaniques RGB, écrans 240Hz et fauteuils gaming.'
  },
  {
    id: 'tpl-shopelios-energy',
    name: 'IGNIS — Énergie & Bois',
    headline: 'Combustibles écologiques haute performance, pellets certifiés DINplus et solutions de chauffage durable.',
    description: 'La référence e-commerce pour distributeurs de granulés de bois, bûches compressées et poêles. Inclut calculateur de livraison palette, fiche technique complète et devis pro.'
  },
  {
    id: 'tpl-topgart-garden',
    name: 'TERRA — Espaces Verts & Outillage',
    headline: 'Matériel de motoculture professionnelle, outillage robuste et équipements de précision pour espaces verts.',
    description: 'L’univers pour revendeurs de matériel de jardinage et motoculture. Présentation soignée des garanties 2 à 5 ans, pièces détachées et comparateur de motorisations.'
  },
  {
    id: 'tpl-lenha-design',
    name: 'NORDIC — Poêles & Design',
    headline: 'Élégance scandinave, flamme contemporaine et confort thermique haute efficacité Flamme Verte 7*.',
    description: 'Univers épuré pour cheministes et installateurs de poêles à bois et granulés. Intègre simulateur de puissance en kW, visuels immersifs et demandes d’étude thermique préalable.'
  },
  {
    id: 'tpl-hlg-appliances',
    name: 'KRONOS — Électroménager & Cuisine',
    headline: 'Électroménager d’exception, équipements encastrables et technologies silencieuses pour la cuisine moderne.',
    description: 'Boutique haut de gamme axée sur la clarté et la confiance. Présentation soignée des indices d’énergie, des dimensions d’encastrement et options de livraison avec mise en service.'
  },
  {
    id: 'tpl-woodcraft-pro',
    name: 'SYLVA — Artisanat & Bois',
    headline: 'Menuiserie d’art, ébénisterie sur-mesure et aménagements intérieurs durables.',
    description: 'Template premium pour artisans menuisiers, agenceurs et créateurs d’espaces bois d’exception.'
  },
  {
    id: 'tpl-luxe-barber',
    name: 'BARON — Soins & Barbier',
    headline: 'L’art traditionnel du rasage, coupes d’exception et rituels de soin masculin haut de gamme.',
    description: 'Template élégant au style vintage moderne pour salons de coiffure masculine et barbiers d’élite.'
  },
  {
    id: 'tpl-juris-lex',
    name: 'JUSTICIA — Droit & Conseil',
    headline: 'Rigueur, discrétion et excellence juridique au service de vos intérêts et de votre entreprise.',
    description: 'Template sobre et rassurant pour cabinets d’avocats, notaires et consultants juridiques d’affaires.'
  },
  {
    id: 'tpl-zen-spa',
    name: 'SERENA — Spa & Bien-Être',
    headline: 'Un sanctuaire de sérénité dédié à la régénération du corps, à la relaxation et aux soins holistiques.',
    description: 'Atmosphère apaisante avec tons minéraux, conçu pour instituts de beauté, spas et centres de bien-être.'
  },
  {
    id: 'tpl-minimal-mode',
    name: 'ÉPURE — Mode & Prêt-à-Porter',
    headline: 'Vestiaire contemporain éco-responsable, coupes intemporelles et matières d’exception.',
    description: 'Boutique e-commerce minimaliste et responsive avec panier slide-over, filtres de tailles et fiches produits immersives.'
  },
  {
    id: 'tpl-gourmet-bio',
    name: 'TERROIR — Gastronomie Fine',
    headline: 'Sélection rigoureuse de produits du terroir, épicerie artisanale et vins de vignerons passionnés.',
    description: 'Catalogue gourmand chaleureux avec badges d’origine AOP/BIO, accords mets-vins et commande directe.'
  }
];

for (const t of templatesUpdates) {
  updateTpl.run(t.name, t.headline, t.description, t.id);
  console.log(`✓ Mis à jour : ${t.id} -> ${t.name}`);
}

const all = db.prepare('SELECT id, name FROM templates ORDER BY name ASC').all();
console.log('\n--- Liste actuelle des templates dans helpot.db ---');
all.forEach((t) => console.log(`• [${t.id}] ${t.name}`));
