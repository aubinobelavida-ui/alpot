import path from 'path';
import fs from 'fs';
import os from 'os';
// Using Node.js 22+ native SQLite DatabaseSync
import { DatabaseSync } from 'node:sqlite';

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  // On Vercel / serverless environment, process.cwd() is read-only (/var/task).
  // We must fall back to os.tmpdir() (/tmp), which is the only writable directory on AWS Lambda.
  let dbDir: string;
  try {
    const localDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    // Test write permission
    const testFile = path.join(localDir, '.write-test');
    fs.writeFileSync(testFile, '');
    fs.unlinkSync(testFile);
    dbDir = localDir;
  } catch {
    // Read-only filesystem detected (Vercel / Lambda) -> fall back to /tmp
    dbDir = path.join(os.tmpdir(), 'helpot-data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  const dbPath = path.join(dbDir, 'helpot.db');
  const db = new DatabaseSync(dbPath);
  
  // Enable WAL mode & foreign keys
  try {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
  } catch {
    // Ignore if WAL pragma is not supported on ephemeral /tmp
  }

  initSchema(db);
  seedInitialData(db);

  dbInstance = db;
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    -- Users & Auth
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CLIENT', -- 'ADMIN', 'CLIENT'
      is_verified INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Categories & Sub-categories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sub_categories (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    -- Templates Master (Catalog)
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      headline TEXT,
      description TEXT,
      price REAL NOT NULL,
      category_id TEXT NOT NULL,
      sub_category_id TEXT,
      type TEXT NOT NULL, -- 'ECOMMERCE', 'SERVICE_SHOWCASE', 'HYBRID'
      thumbnail_url TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      features_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id)
    );

    -- Template Screenshots (Gallery up to 10 screenshots)
    CREATE TABLE IF NOT EXISTS template_screenshots (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      page_name TEXT NOT NULL,
      image_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    );

    -- Template Blueprint Pages & Sections (used for deep-cloning)
    CREATE TABLE IF NOT EXISTS template_blueprint_pages (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      is_home INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      sections_json TEXT NOT NULL, -- JSON array of default sections with their widgets/settings
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    );

    -- Orders & Order Items
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      total_amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      status TEXT NOT NULL DEFAULT 'PAID', -- 'PENDING', 'PAID', 'FAILED', 'REFUNDED'
      payment_gateway TEXT NOT NULL DEFAULT 'stripe_mock',
      payment_intent_id TEXT,
      promo_code TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      unit_price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (template_id) REFERENCES templates(id)
    );

    -- Site Instances (Multi-tenant purchased sites)
    CREATE TABLE IF NOT EXISTS site_instances (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      order_item_id TEXT,
      name TEXT NOT NULL,
      subdomain_slug TEXT UNIQUE NOT NULL,
      custom_domain TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'CONFIGURING', 'READY_TO_PUBLISH', 'PUBLISHED', 'SUSPENDED'
      type TEXT NOT NULL, -- 'ECOMMERCE', 'SERVICE_SHOWCASE', 'HYBRID'
      global_theme_json TEXT, -- colors, fonts, radius
      seo_meta_json TEXT,
      company_info_json TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (template_id) REFERENCES templates(id)
    );

    -- Site Pages
    CREATE TABLE IF NOT EXISTS site_pages (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      is_home INTEGER NOT NULL DEFAULT 0,
      seo_title TEXT,
      seo_description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (site_id) REFERENCES site_instances(id) ON DELETE CASCADE
    );

    -- Site Sections (The modular building blocks of a page)
    CREATE TABLE IF NOT EXISTS site_sections (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      site_id TEXT NOT NULL,
      type TEXT NOT NULL, -- 'header', 'hero', 'products_grid', 'services_grid', 'about', 'testimonials', 'contact_form', 'footer', etc.
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      settings_json TEXT NOT NULL, -- settings of the section and contained elements
      styles_json TEXT, -- paddings, colors, fonts, alignment
      FOREIGN KEY (page_id) REFERENCES site_pages(id) ON DELETE CASCADE,
      FOREIGN KEY (site_id) REFERENCES site_instances(id) ON DELETE CASCADE
    );

    -- Site Products (for e-commerce enabled sites)
    CREATE TABLE IF NOT EXISTS site_products (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      compare_price REAL,
      sku TEXT,
      stock INTEGER NOT NULL DEFAULT 10,
      images_json TEXT,
      category_name TEXT,
      is_featured INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (site_id) REFERENCES site_instances(id) ON DELETE CASCADE
    );

    -- Site Services (for professional craft & service sites)
    CREATE TABLE IF NOT EXISTS site_services (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      price_starting_at REAL,
      duration TEXT,
      FOREIGN KEY (site_id) REFERENCES site_instances(id) ON DELETE CASCADE
    );

    -- Site Blog Posts
    CREATE TABLE IF NOT EXISTS site_blog_posts (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT,
      excerpt TEXT,
      cover_image TEXT,
      author_name TEXT,
      published_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (site_id) REFERENCES site_instances(id) ON DELETE CASCADE
    );

    -- Site Form Submissions (Leads, contacts, quote requests)
    CREATE TABLE IF NOT EXISTS site_form_submissions (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      form_type TEXT NOT NULL DEFAULT 'contact',
      name TEXT,
      email TEXT,
      phone TEXT,
      message TEXT,
      payload_json TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (site_id) REFERENCES site_instances(id) ON DELETE CASCADE
    );

    -- Publication Releases (Immutable snapshots of published sites)
    CREATE TABLE IF NOT EXISTS publication_releases (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      snapshot_json TEXT NOT NULL,
      published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      note TEXT,
      FOREIGN KEY (site_id) REFERENCES site_instances(id) ON DELETE CASCADE
    );

    -- Indexes for fast multi-tenant queries
    CREATE INDEX IF NOT EXISTS idx_site_instances_user ON site_instances(user_id);
    CREATE INDEX IF NOT EXISTS idx_site_instances_slug ON site_instances(subdomain_slug);
    CREATE INDEX IF NOT EXISTS idx_site_pages_site ON site_pages(site_id);
    CREATE INDEX IF NOT EXISTS idx_site_sections_page ON site_sections(page_id);
    CREATE INDEX IF NOT EXISTS idx_site_products_site ON site_products(site_id);
  `);
}

function seedInitialData(db: DatabaseSync) {
  // Check if categories are already seeded
  const existingCat = db.prepare('SELECT count(*) as count FROM categories').get() as { count: number };
  if (existingCat.count > 0) return;

  // 1. Seed Users (Admin & Demo client)
  // Password hashes for:
  // admin@helpot.com -> admin123456 ($2a$10$wE99o7O54nC7vYw4c6.EmejP1M91N.8p04hE6YhR5e/v8v0X5yY8y)
  // demo@helpot.com -> demo123456
  const hashAdmin = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // 'password'
  const hashDemo = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // 'password'

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role) VALUES 
    ('user-admin-1', 'admin@helpot.com', ?, 'Administrateur HELPot', 'ADMIN'),
    ('user-demo-1', 'demo@helpot.com', ?, 'Thomas Martin', 'CLIENT')
  `).run(hashAdmin, hashDemo);

  // 2. Seed Categories & Sub-categories
  const categories = [
    {
      id: 'metiers-artisanat',
      name: 'Métiers et artisanat',
      description: 'Sites pour artisans du bâtiment, créateurs et métiers manuels d’excellence.',
      icon: 'Hammer',
      sort_order: 1,
      subs: [
        { id: 'menuisiers', name: 'Menuisiers', slug: 'menuisiers' },
        { id: 'coiffeurs', name: 'Coiffeurs', slug: 'coiffeurs' },
        { id: 'barbiers', name: 'Barbiers', slug: 'barbiers' },
        { id: 'artisans', name: 'Artisans', slug: 'artisans' },
        { id: 'electriciens', name: 'Électriciens', slug: 'electriciens' },
        { id: 'plombiers', name: 'Plombiers', slug: 'plombiers' },
        { id: 'peintres', name: 'Peintres', slug: 'peintres' },
        { id: 'decorateurs', name: 'Décorateurs', slug: 'decorateurs' },
        { id: 'construction', name: 'Entreprises de construction', slug: 'entreprises-construction' }
      ]
    },
    {
      id: 'services-pro',
      name: 'Services professionnels',
      description: 'Vitrine haut de gamme pour cabinets juridiques, comptables et consultants.',
      icon: 'Briefcase',
      sort_order: 2,
      subs: [
        { id: 'avocats', name: 'Cabinets d’avocats', slug: 'cabinets-avocats' },
        { id: 'conseil', name: 'Cabinets de conseil', slug: 'cabinets-conseil' },
        { id: 'financement', name: 'Cabinets de financement', slug: 'cabinets-financement' },
        { id: 'consultants', name: 'Consultants indépendants', slug: 'consultants-independants' },
        { id: 'agences', name: 'Agences professionnelles', slug: 'agences-pro' },
        { id: 'experts-comptables', name: 'Experts-comptables', slug: 'experts-comptables' }
      ]
    },
    {
      id: 'beaute-bien-etre',
      name: 'Beauté et bien-être',
      description: 'Univers immersifs et apaisants pour spas, instituts et praticiens bien-être.',
      icon: 'Sparkles',
      sort_order: 3,
      subs: [
        { id: 'spas', name: 'Spas', slug: 'spas' },
        { id: 'instituts-beaute', name: 'Instituts de beauté', slug: 'instituts-beaute' },
        { id: 'massage', name: 'Salons de massage', slug: 'salons-massage' },
        { id: 'bien-etre', name: 'Centres de bien-être', slug: 'centres-bien-etre' },
        { id: 'fitness', name: 'Studios de fitness', slug: 'studios-fitness' }
      ]
    },
    {
      id: 'ecommerce',
      name: 'E-commerce',
      description: 'Boutiques en ligne optimisées pour la conversion et la vente de produits.',
      icon: 'ShoppingBag',
      sort_order: 4,
      subs: [
        { id: 'mode', name: 'Mode et vêtements', slug: 'mode-vetements' },
        { id: 'cosmetiques', name: 'Cosmétiques', slug: 'cosmetiques' },
        { id: 'electronique', name: 'Électronique', slug: 'electronique' },
        { id: 'mobilier', name: 'Mobilier et décoration', slug: 'mobilier-decoration' },
        { id: 'bijouterie', name: 'Bijouterie', slug: 'bijouterie' },
        { id: 'alimentation', name: 'Alimentation', slug: 'alimentation' },
        { id: 'accessoires', name: 'Accessoires', slug: 'accessoires' }
      ]
    },
    {
      id: 'autres-secteurs',
      name: 'Autres secteurs',
      description: 'Formations, restauration, immobilier et nouvelles activités en expansion.',
      icon: 'Layers',
      sort_order: 5,
      subs: [
        { id: 'restauration', name: 'Restauration & Cafés', slug: 'restauration' },
        { id: 'formation', name: 'Centres de formation', slug: 'formation' }
      ]
    }
  ];

  const insertCat = db.prepare('INSERT INTO categories (id, name, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)');
  const insertSub = db.prepare('INSERT INTO sub_categories (id, category_id, name, slug) VALUES (?, ?, ?, ?)');

  for (const cat of categories) {
    insertCat.run(cat.id, cat.name, cat.description, cat.icon, cat.sort_order);
    for (const sub of cat.subs) {
      insertSub.run(sub.id, cat.id, sub.name, sub.slug);
    }
  }

  // 3. Seed Diverse Templates with full specifications
  const templates = [
    {
      id: 'tpl-woodcraft-pro',
      name: 'Atelier WoodCraft — Menuiserie & Agencement',
      slug: 'atelier-woodcraft-menuiserie',
      headline: 'Sublimez vos créations bois avec une vitrine chaleureuse, portfolio et devis en ligne.',
      description: 'Conçu sur-mesure pour les artisans menuisiers, ébénistes et décorateurs d’intérieur. Présentez vos essences nobles, vos réalisations phares, vos tarifs indicatifs et recueillez des demandes de devis qualifiées en toute simplicité.',
      price: 189.00,
      category_id: 'metiers-artisanat',
      sub_category_id: 'menuisiers',
      type: 'SERVICE_SHOWCASE',
      thumbnail_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
      features_json: JSON.stringify([
        'Section Portfolio & Zoom avant/après',
        'Formulaire de demande de devis personnalisé',
        'Présentation des matériaux et savoir-faire',
        'Avis clients & labels qualité vérifiés',
        'Optimisation SEO locale pour artisans'
      ]),
      screenshots: [
        { page_name: 'Landing Page (Accueil)', image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80', sort_order: 1 },
        { page_name: 'Page Réalisations / Galerie', image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80', sort_order: 2 },
        { page_name: 'Fiche Réalisation Détaillée', image_url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1200&q=80', sort_order: 3 },
        { page_name: 'Page Services & Tarifs', image_url: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=80', sort_order: 4 },
        { page_name: 'Page Devis en Ligne', image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80', sort_order: 5 },
        { page_name: 'Page À Propos & Savoir-faire', image_url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80', sort_order: 6 },
        { page_name: 'Page Contact & Plan d’accès', image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80', sort_order: 7 },
        { page_name: 'Page Conseils / Blog Bois', image_url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80', sort_order: 8 }
      ]
    },
    {
      id: 'tpl-luxe-barber',
      name: 'Gentleman Barber — Salon & Soins Homme',
      slug: 'gentleman-barber-salon',
      headline: 'Ambiance feutrée, prise de rendez-vous fluide et boutique de soins capillaires.',
      description: 'L’élégance vintage et moderne réunie pour les barbiers et salons de coiffure masculine haut de gamme. Intègre la présentation de l’équipe, la carte des prestations avec durée/tarifs et la vente de produits capillaires.',
      price: 199.00,
      category_id: 'metiers-artisanat',
      sub_category_id: 'barbiers',
      type: 'HYBRID',
      thumbnail_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
      features_json: JSON.stringify([
        'Carte interactive des prestations et forfaits',
        'Module de réservation et prise de RDV',
        'Mini-boutique e-commerce pour huiles et soins',
        'Galerie Instagram & ambiance du salon',
        'Horaires d’ouverture en temps réel'
      ]),
      screenshots: [
        { page_name: 'Landing Page Principale', image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80', sort_order: 1 },
        { page_name: 'Menu des Prestations & Tarifs', image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80', sort_order: 2 },
        { page_name: 'Boutique de Produits & Cires', image_url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=1200&q=80', sort_order: 3 },
        { page_name: 'Fiche Soin Détaillée', image_url: 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=1200&q=80', sort_order: 4 },
        { page_name: 'Panier d’Achat Rapide', image_url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1200&q=80', sort_order: 5 },
        { page_name: 'Réservation de Rendez-vous', image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80', sort_order: 6 },
        { page_name: 'L’Équipe des Maîtres Barbiers', image_url: 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?auto=format&fit=crop&w=1200&q=80', sort_order: 7 }
      ]
    },
    {
      id: 'tpl-juris-lex',
      name: 'JurisLex — Cabinet d’Avocats & Conseil Juridique',
      slug: 'jurislex-cabinet-avocats',
      headline: 'Rigueur, prestige et autorité pour cabinets juridiques et experts du droit.',
      description: 'Une identité visuelle sobre et percutante qui inspire la plus grande confiance. Développé pour mettre en valeur les domaines d’expertise juridique, les associés, les publications légales et faciliter la prise de premier contact confidentiel.',
      price: 249.00,
      category_id: 'services-pro',
      sub_category_id: 'avocats',
      type: 'SERVICE_SHOWCASE',
      thumbnail_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
      features_json: JSON.stringify([
        'Catalogue des domaines d’intervention juridique',
        'Portraits et biographies des associés',
        'Module de consultation et formulaire sécurisé',
        'Espace veille juridique & actualités doctrinales',
        'Conformité stricte déontologique et RGPD'
      ]),
      screenshots: [
        { page_name: 'Accueil Institutionnel', image_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80', sort_order: 1 },
        { page_name: 'Domaines d’Intervention', image_url: 'https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?auto=format&fit=crop&w=1200&q=80', sort_order: 2 },
        { page_name: 'Fiche d’un Domaine Spécifique', image_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80', sort_order: 3 },
        { page_name: 'Biographies des Associés', image_url: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=1200&q=80', sort_order: 4 },
        { page_name: 'Blog Juridique & Veille', image_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80', sort_order: 5 },
        { page_name: 'Demande de Rendez-vous Confidentiel', image_url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80', sort_order: 6 }
      ]
    },
    {
      id: 'tpl-zen-spa',
      name: 'Aura Zen — Spa & Institut Bien-Être Holistique',
      slug: 'aura-zen-spa-bien-etre',
      headline: 'Un sanctuaire de douceur, réservation de rituels et vente de soins naturels.',
      description: 'L’univers rêvé pour les centres de thalassothérapie, spas urbains et praticiens de massages ayurvédiques. Présentez vos soins signatures, vos cabines de relaxation et permettez à vos clients d’offrir des cartes cadeaux.',
      price: 219.00,
      category_id: 'beaute-bien-etre',
      sub_category_id: 'spas',
      type: 'HYBRID',
      thumbnail_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
      features_json: JSON.stringify([
        'Carte des rituels et forfaits bien-être',
        'Vente de bons et cartes cadeaux instantanés',
        'Boutique de cosmétiques biologiques',
        'Visite virtuelle des cabines et bains',
        'Témoignages et avis certifiés'
      ]),
      screenshots: [
        { page_name: 'Accueil Épuré & Vidéo d’ambiance', image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80', sort_order: 1 },
        { page_name: 'Carte des Soins & Massages', image_url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80', sort_order: 2 },
        { page_name: 'Boutique Produits Botaniques', image_url: 'https://images.unsplash.com/photo-1608248597359-251d18f50428?auto=format&fit=crop&w=1200&q=80', sort_order: 3 },
        { page_name: 'Générateur de Bons Cadeaux', image_url: 'https://images.unsplash.com/photo-1512290900672-1f4175514f77?auto=format&fit=crop&w=1200&q=80', sort_order: 4 },
        { page_name: 'Réservation en Ligne', image_url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80', sort_order: 5 }
      ]
    },
    {
      id: 'tpl-minimal-mode',
      name: 'Maison Épure — E-commerce Mode & Accessoires',
      slug: 'maison-epure-mode-ecommerce',
      headline: 'L’élégance minimaliste pour créateurs de mode, maroquinerie et prêt-à-porter.',
      description: 'Une boutique e-commerce de calibre international. Parfaitement optimisée pour la mise en valeur des looks, avec gestion complète des tailles/coloris, panier tiroir rapide, paiement Stripe et gestion des collections saisonnières.',
      price: 269.00,
      category_id: 'ecommerce',
      sub_category_id: 'mode',
      type: 'ECOMMERCE',
      thumbnail_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
      features_json: JSON.stringify([
        'Lookbook immersif et filtres de collection',
        'Fiche produit avec sélecteur de variantes & tailles',
        'Panier slide-over et tunnel de commande ultra-rapide',
        'Calculateur de livraison et codes promos',
        'Gestion complète des stocks et réassorts'
      ]),
      screenshots: [
        { page_name: 'Hero & Nouvelle Collection', image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80', sort_order: 1 },
        { page_name: 'Catalogue & Grille Filtrable', image_url: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1200&q=80', sort_order: 2 },
        { page_name: 'Fiche Produit avec Zoom et Variantes', image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80', sort_order: 3 },
        { page_name: 'Panier Tiroir (Cart Drawer)', image_url: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1200&q=80', sort_order: 4 },
        { page_name: 'Page de Paiement Sécurisé', image_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80', sort_order: 5 },
        { page_name: 'Lookbook & Histoire de Marque', image_url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=80', sort_order: 6 }
      ]
    },
    {
      id: 'tpl-gourmet-bio',
      name: 'Terroir & Saveurs — Épicerie Fine & Gastronomie',
      slug: 'terroir-saveurs-epicerie-fine',
      headline: 'Vendez vos produits du terroir, paniers gourmands et vins d’artisans en direct.',
      description: 'Conçu spécialement pour les producteurs locaux, épiceries fines, chocolatiers et négociants en vin. Mettez en avant l’origine géographique, les labels BIO/AOC et stimulez le panier moyen.',
      price: 239.00,
      category_id: 'ecommerce',
      sub_category_id: 'alimentation',
      type: 'ECOMMERCE',
      thumbnail_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      features_json: JSON.stringify([
        'Grille produits par terroir et appellation',
        'Vente de paniers composés & abonnements',
        'Fiches dégustation et accords mets & vins',
        'Calcul des frais d’expédition selon le poids',
        'Module de Click & Collect local'
      ]),
      screenshots: [
        { page_name: 'Vitrine Gourmande Principale', image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80', sort_order: 1 },
        { page_name: 'Rayon Vins & Spiritueux', image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80', sort_order: 2 },
        { page_name: 'Fiche Dégustation d’un Cru', image_url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=80', sort_order: 3 },
        { page_name: 'Panier Gourmand & Cadeaux', image_url: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=1200&q=80', sort_order: 4 },
        { page_name: 'Frais de Port & Livraison Frais', image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80', sort_order: 5 }
      ]
    }
  ];

  const insertTpl = db.prepare(`
    INSERT INTO templates (id, name, slug, headline, description, price, category_id, sub_category_id, type, thumbnail_url, features_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertScr = db.prepare(`
    INSERT INTO template_screenshots (id, template_id, page_name, image_url, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertBlueprint = db.prepare(`
    INSERT INTO template_blueprint_pages (id, template_id, slug, title, is_home, sort_order, sections_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const t of templates) {
    insertTpl.run(t.id, t.name, t.slug, t.headline, t.description, t.price, t.category_id, t.sub_category_id, t.type, t.thumbnail_url, t.features_json);
    
    // Add screenshots
    let scrIdx = 1;
    for (const s of t.screenshots) {
      insertScr.run(`scr-${t.id}-${scrIdx}`, t.id, s.page_name, s.image_url, s.sort_order);
      scrIdx++;
    }

    // Default pages and sections for blueprints
    const defaultPages = getTemplateBlueprintPages(t.id, t.type, t.name);
    for (const p of defaultPages) {
      insertBlueprint.run(`bp-${t.id}-${p.slug || 'home'}`, t.id, p.slug, p.title, p.is_home, p.sort_order, JSON.stringify(p.sections));
    }
  }

  // 4. Provision a Demo Site Instance for demo@helpot.com so user can immediately test!
  const demoSiteId = 'site-demo-menuiserie';
  db.prepare(`
    INSERT INTO site_instances (
      id, user_id, template_id, name, subdomain_slug, status, type,
      global_theme_json, seo_meta_json, company_info_json
    ) VALUES (
      ?, 'user-demo-1', 'tpl-woodcraft-pro', 'Atelier Dubois & Fils — Menuiserie', 'dubois-menuiserie', 'CONFIGURING', 'SERVICE_SHOWCASE',
      ?, ?, ?
    )
  `).run(
    demoSiteId,
    JSON.stringify({ primaryColor: '#b45309', secondaryColor: '#1c1917', font: 'Inter', radius: '8px' }),
    JSON.stringify({ title: 'Atelier Dubois & Fils — Menuisiers d’art à Lyon', description: 'Conception sur-mesure d’agencements bois, cuisines et mobilier haut de gamme.' }),
    JSON.stringify({ phone: '04 78 00 00 00', email: 'contact@dubois-menuiserie.fr', address: '12 Rue des Artisans, 69002 Lyon' })
  );

  // Clone pages for this demo site
  const demoBlueprint = getTemplateBlueprintPages('tpl-woodcraft-pro', 'SERVICE_SHOWCASE', 'Atelier Dubois & Fils — Menuiserie');
  let pageOrder = 0;
  for (const bpPage of demoBlueprint) {
    const pageId = `page-${demoSiteId}-${bpPage.slug || 'home'}`;
    db.prepare(`
      INSERT INTO site_pages (id, site_id, slug, title, is_home, sort_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(pageId, demoSiteId, bpPage.slug, bpPage.title, bpPage.is_home, pageOrder++);

    let secOrder = 0;
    for (const s of bpPage.sections) {
      db.prepare(`
        INSERT INTO site_sections (id, page_id, site_id, type, name, sort_order, is_hidden, settings_json, styles_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `sec-${pageId}-${secOrder}`,
        pageId,
        demoSiteId,
        s.type,
        s.name,
        secOrder,
        0,
        JSON.stringify(s.settings),
        JSON.stringify(s.styles)
      );
      secOrder++;
    }
  }

  // Add sample products / services
  db.prepare(`
    INSERT INTO site_services (id, site_id, title, description, icon, price_starting_at, duration)
    VALUES 
    ('srv-1', ?, 'Conception de Cuisines Sur-Mesure', 'Cuisines en chêne massif et noyer, plans de travail en granit et îlots centraux intégrés.', 'Utensils', 4500, '2 à 3 semaines'),
    ('srv-2', ?, 'Dressing & Bibliothèques Intégrées', 'Agencement optimisé du sol au plafond avec éclairages LED invisibles et ferrures amorties.', 'BookOpen', 2200, '1 semaine'),
    ('srv-3', ?, 'Escaliers Hélicoïdaux & Droits', 'Structures d’artisanat alliant métal noir et marches en bois massif verni haute résistance.', 'Layers', 3800, '2 semaines')
  `).run(demoSiteId, demoSiteId, demoSiteId);
}

// Generate rich standard sections for blueprints
function getTemplateBlueprintPages(templateId: string, type: string, templateName: string) {
  return [
    {
      slug: '',
      title: 'Accueil (Landing)',
      is_home: 1,
      sort_order: 0,
      sections: [
        {
          type: 'header',
          name: 'En-tête & Navigation',
          settings: {
            brandName: templateName.split('—')[0].trim(),
            logoUrl: '',
            navLinks: [
              { label: 'Accueil', url: '/' },
              { label: 'Nos Réalisations', url: '/realisations' },
              { label: 'Services & Tarifs', url: '/services' },
              { label: 'À Propos', url: '/a-propos' },
              { label: 'Contact & Devis', url: '/contact' }
            ],
            ctaButtonText: 'Demander un devis',
            ctaButtonLink: '/contact'
          },
          styles: {
            bgColor: '#ffffff',
            textColor: '#111827',
            sticky: true
          }
        },
        {
          type: 'hero',
          name: 'Hero Banner Principal',
          settings: {
            title: 'L’art du sur-mesure et l’exigence de la perfection',
            subtitle: 'Des créations artisanales d’exception pensées pour sublimer vos espaces intérieurs et extérieurs.',
            ctaPrimaryText: 'Découvrir nos créations',
            ctaPrimaryLink: '/realisations',
            ctaSecondaryText: 'Prendre rendez-vous',
            ctaSecondaryLink: '/contact',
            bgImageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80',
            overlayOpacity: 50,
            alignment: 'center'
          },
          styles: {
            paddingTop: '96px',
            paddingBottom: '96px',
            textColor: '#ffffff'
          }
        },
        {
          type: 'features',
          name: 'Points Forts & Engagements',
          settings: {
            tagline: 'NOTRE SAVOIR-FAIRE',
            heading: 'Pourquoi confier votre projet à notre atelier ?',
            items: [
              {
                icon: 'Award',
                title: 'Matériaux Nobles & Durables',
                description: 'Bois certifiés FSC et finitions artisanales écologiques garantissant une longévité inégalée.'
              },
              {
                icon: 'Compass',
                title: 'Étude 3D & Devis Gratuit',
                description: 'Visualisation photoréaliste de votre projet avant fabrication et tarification transparente.'
              },
              {
                icon: 'ShieldCheck',
                title: 'Garantie Décennale',
                description: 'Tous nos travaux d’agencement et de menuiserie bénéficient d’une assurance décennale complète.'
              }
            ]
          },
          styles: {
            paddingTop: '80px',
            paddingBottom: '80px',
            bgColor: '#f9fafb'
          }
        },
        {
          type: 'showcase_grid',
          name: 'Grille des Réalisations Phares',
          settings: {
            tagline: 'PORTFOLIO',
            heading: 'Nos derniers chantiers livrés',
            description: 'Découvrez en images la diversité de nos agencements d’intérieur.',
            items: [
              {
                title: 'Cuisine Contemporaine en Chêne Fumé',
                category: 'Agencement Cuisine',
                imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'
              },
              {
                title: 'Bibliothèque Murale avec Échelle',
                category: 'Mobilier Sur-Mesure',
                imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'
              },
              {
                title: 'Dressing Ouvert & Rétro-Éclairé',
                category: 'Chambre Parentale',
                imageUrl: 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&w=800&q=80'
              }
            ]
          },
          styles: {
            paddingTop: '80px',
            paddingBottom: '80px',
            bgColor: '#ffffff'
          }
        },
        {
          type: 'testimonials',
          name: 'Avis Clients & Témoignages',
          settings: {
            tagline: 'CONFIANCE',
            heading: 'Ce que nos clients disent de nous',
            items: [
              {
                author: 'Marc & Sophie V.',
                role: 'Propriétaires à Caluire',
                content: 'Un travail d’une précision remarquable pour notre verrière et nos placards sur-mesure. Respect scrupuleux des délais et finitions impeccables.',
                rating: 5
              },
              {
                author: 'Élodie D.',
                role: 'Architecte d’intérieur',
                content: 'Je collabore avec l’atelier depuis 4 ans sur tous mes chantiers haut de gamme. Un vrai sens du détail et une écoute irréprochable.',
                rating: 5
              }
            ]
          },
          styles: {
            paddingTop: '80px',
            paddingBottom: '80px',
            bgColor: '#f8fafc'
          }
        },
        {
          type: 'cta_banner',
          name: 'Bannière d’Appel à l’Action',
          settings: {
            title: 'Vous avez un projet en tête ?',
            subtitle: 'Contactez notre atelier dès aujourd’hui pour une étude personnalisée sans engagement.',
            buttonText: 'Demander mon devis gratuit',
            buttonLink: '/contact'
          },
          styles: {
            bgColor: '#1e293b',
            textColor: '#ffffff',
            paddingTop: '70px',
            paddingBottom: '70px'
          }
        },
        {
          type: 'footer',
          name: 'Pied de Page',
          settings: {
            copyright: `© ${new Date().getFullYear()} Tous droits réservés. Réalisé avec HELPot.`,
            columns: [
              {
                title: 'Navigation',
                links: [
                  { label: 'Accueil', url: '/' },
                  { label: 'Réalisations', url: '/realisations' },
                  { label: 'Services', url: '/services' }
                ]
              },
              {
                title: 'Informations',
                links: [
                  { label: 'Mentions Légales', url: '/mentions-legales' },
                  { label: 'Politique de Confidentialité', url: '/confidentialite' }
                ]
              }
            ]
          },
          styles: {
            bgColor: '#0f172a',
            textColor: '#94a3b8'
          }
        }
      ]
    },
    {
      slug: 'services',
      title: 'Services & Tarifs',
      is_home: 0,
      sort_order: 1,
      sections: [
        {
          type: 'hero_simple',
          name: 'Titre de page Services',
          settings: {
            title: 'Nos Services & Prestations',
            subtitle: 'Une gamme complète de solutions sur-mesure adaptées à chaque intérieur.'
          },
          styles: { bgColor: '#f8fafc', paddingTop: '60px', paddingBottom: '60px' }
        },
        {
          type: 'services_list',
          name: 'Liste des prestations détaillées',
          settings: { showPrices: true },
          styles: { paddingTop: '60px', paddingBottom: '60px' }
        }
      ]
    },
    {
      slug: 'contact',
      title: 'Contact & Devis',
      is_home: 0,
      sort_order: 2,
      sections: [
        {
          type: 'hero_simple',
          name: 'Titre de page Contact',
          settings: {
            title: 'Contactez-nous & Devis',
            subtitle: 'Nous vous répondons sous 24 à 48 heures ouvrées.'
          },
          styles: { bgColor: '#f8fafc', paddingTop: '60px', paddingBottom: '60px' }
        },
        {
          type: 'contact_form',
          name: 'Formulaire de Contact & Devis',
          settings: {
            showPhone: true,
            showProjectDetails: true,
            submitButtonText: 'Envoyer ma demande'
          },
          styles: { paddingTop: '60px', paddingBottom: '60px' }
        }
      ]
    }
  ];
}
