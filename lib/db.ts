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
  // 1. Seed Users (Admin & Demo client)
  // Password hashes for:
  // admin@helpot.com -> admin123456
  // demo@helpot.com -> demo123456
  const hashAdmin = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // 'password'
  const hashDemo = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // 'password'

  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role) VALUES 
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

  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (id, name, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)');
  const insertSub = db.prepare('INSERT OR IGNORE INTO sub_categories (id, category_id, name, slug) VALUES (?, ?, ?, ?)');

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
      name: 'SYLVA — Artisanat & Bois',
      slug: 'sylva-artisanat-bois',
      headline: 'L’univers de l’ébénisterie d’art : agencements sur-mesure, cuisines nobles et mobilier contemporain.',
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
      name: 'BARON — Soins & Barbier',
      slug: 'baron-soins-barbier',
      headline: 'L’univers du soin masculin d’élite : coupes précises, rituels barbe à l’ancienne et cosmétiques botaniques.',
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
      name: 'JUSTICIA — Droit & Conseil',
      slug: 'justicia-droit-conseil',
      headline: 'L’univers du conseil juridique et contentieux : rigueur, prestige et accompagnement confidentiel.',
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
      name: 'SERENA — Spa & Bien-Être',
      slug: 'serena-spa-bien-etre',
      headline: 'L’univers holistique et relaxation : soins naturels, massages du monde et rituels apaisants.',
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
      name: 'ÉPURE — Mode & Prêt-à-Porter',
      slug: 'epure-mode-pret-a-porter',
      headline: 'L’univers de la mode contemporaine : coupes architecturales, matières durables et maroquinerie fine.',
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
      name: 'TERROIR — Gastronomie Fine',
      slug: 'terroir-gastronomie-fine',
      headline: 'L’univers des saveurs authentiques : épicerie d’exception, produits bio de nos régions et grands crus.',
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
    },
    {
      id: 'tpl-shopelios-energy',
      name: 'IGNIS — Énergie & Bois',
      slug: 'ignis-energie-bois',
      headline: 'L’univers du chauffage durable : granulés de bois certifiés DINplus, bûches compressées et poêles.',
      description: 'Inspiré des plus grandes boutiques de chauffage durable. Idéal pour distributeurs de granulés, bûches compressées et poêles. Inclut le calcul de livraison par palette avec déchargement au transpalette et gestion des stocks en temps réel.',
      price: 269.00,
      category_id: 'ecommerce',
      sub_category_id: 'mobilier',
      type: 'ECOMMERCE',
      thumbnail_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      features_json: JSON.stringify([
        'Calculateur de livraison par palette et code postal',
        'Fiche technique détaillée (pouvoir calorifique, humidité, taux de cendres)',
        'Sélecteur de quantité par palette ou à la tonne',
        'Badges labels de qualité DINplus et ENplus A1',
        'Paiement en plusieurs fois et devis pro'
      ]),
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
      name: 'TERRA — Espaces Verts & Outillage',
      slug: 'terra-espaces-verts-outillage',
      headline: 'L’univers de la motoculture & du plein air : outillage robuste, tondeuses autotractées et équipement pro.',
      description: 'L’univers de référence pour les revendeurs de matériel de jardinage, motoculture et entretien d’espaces verts. Présentation percutante des garanties, pièces détachées et comparateur de motorisations.',
      price: 259.00,
      category_id: 'ecommerce',
      sub_category_id: 'mobilier',
      type: 'ECOMMERCE',
      thumbnail_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
      features_json: JSON.stringify([
        'Filtres par type de motorisation (thermique, batterie, électrique)',
        'Mise en avant de la garantie constructeur 2 à 5 ans',
        'Section pièces détachées et vue éclatée',
        'Conseils d’entretien et guides saisonniers',
        'Click & Collect en magasin et livraison directe'
      ]),
      screenshots: [
        { page_name: 'Vitrine Motoculture & Jardin', image_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80', sort_order: 1 },
        { page_name: 'Rayon Tondeuses & Tracteurs', image_url: 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&w=1200&q=80', sort_order: 2 },
        { page_name: 'Fiche Tronçonneuse Pro', image_url: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=80', sort_order: 3 },
        { page_name: 'Panier Express', image_url: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1200&q=80', sort_order: 4 }
      ]
    },
    {
      id: 'tpl-lenha-design',
      name: 'NORDIC — Poêles & Design',
      slug: 'nordic-poeles-design',
      headline: 'L’univers du feu scandinave : poêles contemporains, foyers épurés et label Flamme Verte 7 étoiles.',
      description: 'Conçu avec une direction artistique minimaliste et scandinave. Met en valeur les lignes élégantes des poêles à bois et à granulés, l’écologie et l’art de vivre hygge.',
      price: 279.00,
      category_id: 'ecommerce',
      sub_category_id: 'mobilier',
      type: 'ECOMMERCE',
      thumbnail_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      features_json: JSON.stringify([
        'Lookbook immersif et zoom matière',
        'Calculateur de puissance adaptée au volume de la pièce (m³)',
        'Labels Flamme Verte 7 étoiles et Ecodesign 2022',
        'Formulaire de demande de visite technique à domicile',
        'Catalogue d’accessoires et serviteurs design'
      ]),
      screenshots: [
        { page_name: 'Ambiance Hygge & Poêles', image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80', sort_order: 1 },
        { page_name: 'Collection Poêles à Granulés', image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80', sort_order: 2 },
        { page_name: 'Fiche Poêle Scandinave', image_url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1200&q=80', sort_order: 3 },
        { page_name: 'Devis Pose & Installation', image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80', sort_order: 4 }
      ]
    },
    {
      id: 'tpl-gamingbm-esport',
      name: 'AURA — Gaming',
      slug: 'aura-gaming',
      headline: 'L’univers gaming & esport par excellence : setups cyberpunk, hardware sur-mesure et périphériques compétitifs.',
      description: 'Une identité visuelle dark mode percutante avec néons bleus/violets. Optimisé pour la vente de tours gaming assemblées, cartes graphiques, claviers mécaniques RGB, écrans 240Hz et fauteuils gaming.',
      price: 289.00,
      category_id: 'ecommerce',
      sub_category_id: 'electronique',
      type: 'ECOMMERCE',
      thumbnail_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80',
      features_json: JSON.stringify([
        'Thème sombre immersif (Dark Mode) avec accents néons',
        'Tableau d’indicateurs de FPS par jeu (Fortnite, Warzone, Cyberpunk)',
        'Fiche technique détaillée (CPU, GPU, RAM, Watercooling)',
        'Badges Garantie zéro pixel mort et composants testés',
        'Panier slide-over et configurateur interactif'
      ]),
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
      name: 'KRONOS — Électroménager & Cuisine',
      slug: 'kronos-electromenager-cuisine',
      headline: 'L’univers de la cuisine et du confort domestique : appareils encastrables, silence et durabilité.',
      description: 'Boutique moderne et fonctionnelle axée sur la clarté et la confiance. Présentation soignée des classes énergétiques, des dimensions d’encastrement et des options d’extension de garantie.',
      price: 249.00,
      category_id: 'ecommerce',
      sub_category_id: 'electronique',
      type: 'ECOMMERCE',
      thumbnail_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
      features_json: JSON.stringify([
        'Affichage des étiquettes énergie et indice de réparabilité',
        'Filtres par dimensions (largeur, hauteur, pose libre ou intégrable)',
        'Option reprise de l’ancien appareil et mise en service à domicile',
        'Avis clients vérifiés et comparateur de fiches techniques',
        'Livraison sur rendez-vous avec créneau de 2h'
      ]),
      screenshots: [
        { page_name: 'Accueil Électroménager & Cuisine', image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80', sort_order: 1 },
        { page_name: 'Rayon Fours & Cuisson', image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80', sort_order: 2 },
        { page_name: 'Fiche Réfrigérateur Connecté', image_url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=1200&q=80', sort_order: 3 },
        { page_name: 'Panier & Forfait Installation', image_url: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=1200&q=80', sort_order: 4 }
      ]
    }
  ];

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

// Generate rich standard sections for blueprints (Landing + 3 Annex pages per template)
function getTemplateBlueprintPages(templateId: string, type: string, templateName: string) {
  const brandName = templateName.split('—')[0].trim();

  // 1. AURA — GAMING
  if (templateId === 'tpl-gamingbm-esport') {
    return buildUniversePages({
      templateId,
      brandName: 'AURA Gaming',
      primaryColor: '#8b5cf6',
      darkTheme: true,
      heroTitle: 'PC Gamer Cyber Titan, Setups Esport & Hardware Ultime',
      heroSubtitle: 'Machines de guerre calibrées pour la compétition. Benchmarks 48h certifiés, câblage chirurgical et fluidité absolue sans compromis.',
      heroImage: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1400&q=80',
      catalogSlug: 'boutique',
      catalogTitle: 'Rayon Esport & Hardware',
      catalogSubtitle: 'Tours assemblées avec RTX 4080, claviers opto-mécaniques RGB et écrans Fast IPS 240Hz.',
      universeTitle: 'L’Exigence Esport au service des compétiteurs',
      universeSubtitle: 'Découvrez notre atelier d’assemblage, nos protocoles thermiques et notre banc de test 48h.',
      contactTitle: 'Support Technique & Devis Setup Sur-Mesure',
      featuresTagline: 'HARDWARE SANS COMPROMIS',
      featuresHeading: 'Pourquoi les joueurs compétitifs choisissent AURA',
      featuresItems: [
        { icon: 'ShieldCheck', title: 'Banc d’Essai FurMark 48h', description: 'Chaque tour subit des tests de charge intensifs garantissant une stabilité sans faille en tournoi.' },
        { icon: 'Award', title: 'Garantie 3 ans Enlèvement', description: 'Enlèvement gratuit sur site et prise en charge rapide en cas d’incident matériel.' },
        { icon: 'Compass', title: 'Zéro Pixel Mort & Composants Neufs', description: 'Dalles calibrées d’usine et matériel scellé d’origine constructeur avec factures individuelles.' }
      ],
      testimonials: [
        { author: 'Maxime "NexZ" G.', role: 'Streamer Twitch & joueur Valorant', content: 'Le Cyber Titan ne dépasse jamais 62°C même après 10h de stream intensif en 1440p. Finition irréprochable.', rating: 5 },
        { author: 'Sébastien L.', role: 'Compétiteur Simracing', content: 'Triple écran géré avec une fluidité exceptionnelle. Le packaging avec mousse expansée à l’intérieur est très pro.', rating: 5 }
      ],
      ctaTitle: '+240 FPS Constants en 1440p Ultra sur vos jeux favoris',
      ctaSubtitle: 'Warzone, Apex Legends, Valorant, Cyberpunk 2077 : rejoignez l’élite des compétiteurs.',
      ctaButton: 'Configurer mon PC de combat',
      ctaBg: '#4c1d95'
    });
  }

  // 2. IGNIS — ÉNERGIE
  if (templateId === 'tpl-shopelios-energy') {
    return buildUniversePages({
      templateId,
      brandName: 'IGNIS Énergie',
      primaryColor: '#15803d',
      darkTheme: false,
      heroTitle: 'Granulés de Bois Certifiés DINplus & Bûches Compressées',
      heroSubtitle: 'Combustibles écologiques haute performance livrés à domicile par palette avec déchargement transpalette tout-terrain.',
      heroImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80',
      catalogSlug: 'boutique',
      catalogTitle: 'Pellets & Granulés',
      catalogSubtitle: 'Palettes complètes et sacs individuels de granulés résineux certifiés DINplus et ENplus A1.',
      universeTitle: 'L’Énergie Bois Écologique & Responsable',
      universeSubtitle: 'Une sélection de combustibles 100% naturels issus de forêts gérées durablement sans aucun additif chimique.',
      contactTitle: 'Service Client & Commande par Palette',
      featuresTagline: 'QUALITÉ CERTIFIÉE',
      featuresHeading: 'Pourquoi choisir IGNIS pour votre chauffage',
      featuresItems: [
        { icon: 'Award', title: 'Certifications DINplus & ENplus A1', description: 'Pouvoir calorifique supérieur > 4.9 kWh/kg, humidité < 8% et taux de cendre minimal < 0.5%.' },
        { icon: 'Compass', title: 'Livraison Chariot Embarqué', description: 'Déchargement directement dans votre garage ou abri même sur pente ou terrain gravillonné.' },
        { icon: 'ShieldCheck', title: 'Tarifs Dégressifs par Volume', description: 'Remises attractives dès 2 palettes et facilités de paiement en 3x ou 4x sans frais.' }
      ],
      testimonials: [
        { author: 'Laurent B.', role: 'Foyer équipé à Chambéry', content: 'Très faible résidu de cendres et le chauffeur a déposé la palette au fond de mon garage sans effort.', rating: 5 },
        { author: 'Isabelle M.', role: 'Cliente fidèle à Annecy', content: 'Bûches compressées idéales pour la nuit. Chaleur durable et service client très professionnel.', rating: 5 }
      ],
      ctaTitle: 'Estimez vos frais de livraison par code postal',
      ctaSubtitle: 'Calcul immédiat des délais garantis et des options de déchargement sur votre propriété.',
      ctaButton: 'Calculer la livraison',
      ctaBg: '#14532d'
    });
  }

  // 3. TERRA — ESPACES VERTS
  if (templateId === 'tpl-topgart-garden') {
    return buildUniversePages({
      templateId,
      brandName: 'TERRA Espaces Verts',
      primaryColor: '#ea580c',
      darkTheme: false,
      heroTitle: 'Outillage de Jardin Professionnel & Motoculture Robuste',
      heroSubtitle: 'Tondeuses autotractées, tronçonneuses thermiques et taille-haies conçus pour résister aux travaux d’espaces verts les plus exigeants.',
      heroImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1400&q=80',
      catalogSlug: 'boutique',
      catalogTitle: 'Matériel Motoculture',
      catalogSubtitle: 'Tondeuses thermiques, outillage sans fil 20V et tronçonneuses prêtes à démarrer.',
      universeTitle: 'La Passion des Espaces Verts & de la Mécanique',
      universeSubtitle: 'Chaque équipement est inspecté, réglé et graissé par nos techniciens avant expédition.',
      contactTitle: 'Atelier Mécanique & Conseils d’Achat',
      featuresTagline: 'ROBUSTESSE & FIABILITÉ',
      featuresHeading: 'L’engagement qualité TERRA',
      featuresItems: [
        { icon: 'ShieldCheck', title: 'Garantie Constructeur 2 à 5 ans', description: 'Prise en charge intégrale pièces et main d’œuvre par notre réseau national d’ateliers agréés.' },
        { icon: 'Compass', title: 'Machines Réglées en Atelier', description: 'Chaque équipement est assemblé, contrôlé et démarré par nos mécaniciens avant départ.' },
        { icon: 'Award', title: 'Pièces Disponibles 10 ans', description: 'Assurez la pérennité de vos outils avec des chaînes, lames et filtres d’origine en stock permanent.' }
      ],
      testimonials: [
        { author: 'Guillaume R.', role: 'Paysagiste en Dordogne', content: 'La tronçonneuse 52cc démarre au quart de tour et délivre un couple impressionnant.', rating: 5 },
        { author: 'Alain D.', role: 'Propriétaire de grand parc', content: 'Tondeuse reçue avec l’huile moteur et guide d’utilisation clair. Mulching impeccable.', rating: 5 }
      ],
      ctaTitle: 'Besoin d’aide pour choisir votre motorisation ?',
      ctaSubtitle: 'Thermique, électrique ou batterie : nos spécialistes espaces verts vous guident selon votre terrain.',
      ctaButton: 'Consulter nos experts',
      ctaBg: '#c2410c'
    });
  }

  // 4. NORDIC — POÊLES & DESIGN
  if (templateId === 'tpl-lenha-design') {
    return buildUniversePages({
      templateId,
      brandName: 'NORDIC Poêles',
      primaryColor: '#c2410c',
      darkTheme: false,
      heroTitle: 'Poêles Scandinaves Contemporains & Foyers Haute Efficacité',
      heroSubtitle: 'Sublimez votre intérieur avec l’élégance intemporelle du design nordique, un rendement supérieur à 82% et le label Flamme Verte 7 étoiles.',
      heroImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1400&q=80',
      catalogSlug: 'boutique',
      catalogTitle: 'Collection Poêles & Foyers',
      catalogSubtitle: 'Modèles à bois et granulés avec vitres panoramiques galbées et programmation Wi-Fi.',
      universeTitle: 'L’Art de Vivre Hygge & la Maîtrise du Feu',
      universeSubtitle: 'Une esthétique pure mariant fonte scandinave et acier corten pour une chaleur douce et enveloppante.',
      contactTitle: 'Demande d’Étude Thermique & Devis RGE',
      featuresTagline: 'ÉLÉGANCE NORDIQUE',
      featuresHeading: 'Performance thermique et respect de l’environnement',
      featuresItems: [
        { icon: 'Award', title: 'Label Flamme Verte 7 Étoiles', description: 'Émissions de particules quasi nulles et éligibilité immédiate aux subventions MaPrimeRénov.' },
        { icon: 'ShieldCheck', title: 'Pose Agréée RGE Qualibois', description: 'Installation conforme DTU 24.1, raccordement fumisterie et mise en service certifiée.' },
        { icon: 'Compass', title: 'Inertie Fonte & Double Combustion', description: 'Chaleur par rayonnement restituée pendant plusieurs heures après l’extinction du feu.' }
      ],
      testimonials: [
        { author: 'Benoît & Camille T.', role: 'Rénovation maison d’architecte', content: 'Le poêle Oslo est magnifique. La programmation smartphone est un bonheur au quotidien.', rating: 5 },
        { author: 'Éric V.', role: 'Chalet de montagne à Megève', content: 'Rendement exceptionnel et consommation de bois divisée par deux par rapport à notre ancien foyer.', rating: 5 }
      ],
      ctaTitle: 'Quelle puissance en kW choisir pour votre surface ?',
      ctaSubtitle: 'Nos thermiciens calculent gratuitement la puissance idéale selon l’isolation de votre habitat.',
      ctaButton: 'Simuler ma puissance requise',
      ctaBg: '#1c1917'
    });
  }

  // 5. KRONOS — ÉLECTROMÉNAGER
  if (templateId === 'tpl-hlg-appliances') {
    return buildUniversePages({
      templateId,
      brandName: 'KRONOS Électroménager',
      primaryColor: '#0284c7',
      darkTheme: false,
      heroTitle: 'Électroménager Connecté, Encastrable & Confort Domestique',
      heroSubtitle: 'L’excellence des technologies silencieuses et économes en énergie pour sublimer votre cuisine. Garantie 5 ans et service de pose à domicile sur rendez-vous.',
      heroImage: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1400&q=80',
      catalogSlug: 'boutique',
      catalogTitle: 'Appareils Encastrables & Froid',
      catalogSubtitle: 'Fours pyrolyse multifonctions, combinés Total NoFrost et lave-linges induction basse consommation.',
      universeTitle: 'La Précision Domestique & la Durabilité',
      universeSubtitle: 'Des appareils haut de gamme conçus pour durer avec une sélection de marques aux indices de réparabilité exemplaires.',
      contactTitle: 'Service Clientèle & Forfait Installation',
      featuresTagline: 'CONFORT & DURABILITÉ',
      featuresHeading: 'Un service premium de la commande à la mise en service',
      featuresItems: [
        { icon: 'ShieldCheck', title: 'Livraison & Mise en Service', description: 'Dépôt dans la pièce de votre choix, déballage, mise à niveau et raccordement par des experts.' },
        { icon: 'Compass', title: 'Indice Réparabilité > 8.5/10', description: 'Disponibilité des pièces d’origine garantie pendant au minimum 15 ans.' },
        { icon: 'Award', title: 'Reprise Gratuite de l’Ancien', description: 'Enlèvement de votre ancien équipement pour recyclage écologique certifié Éco-systèmes.' }
      ],
      testimonials: [
        { author: 'Nathalie P.', role: 'Cuisine équipée neuve à Nantes', content: 'Le four pyrolyse chauffe de manière parfaitement homogène et la porte froide est très sécurisante.', rating: 5 },
        { author: 'Frédéric M.', role: 'Appartement à Bordeaux', content: 'Réfrigérateur NoFrost remarquablement silencieux dans une cuisine ouverte sur le salon.', rating: 5 }
      ],
      ctaTitle: 'Tranquillité totale avec l’Extension Sérénité 5 ans',
      ctaSubtitle: 'Pièces d’origine, déplacement et main d’œuvre inclus sans franchise sur tout le gros électroménager.',
      ctaButton: 'Découvrir nos forfaits garanties',
      ctaBg: '#0369a1'
    });
  }

  // 6. SYLVA — ARTISANAT & BOIS
  if (templateId === 'tpl-woodcraft-pro') {
    return buildUniversePages({
      templateId,
      brandName: 'SYLVA Artisanat',
      primaryColor: '#b45309',
      darkTheme: false,
      heroTitle: 'L’Art du Sur-Mesure et l’Exigence de l’Ébénisterie',
      heroSubtitle: 'Des créations artisanales d’exception pensées pour sublimer vos espaces intérieurs : cuisines nobles, dressings et mobilier contemporain.',
      heroImage: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80',
      catalogSlug: 'realisations',
      catalogTitle: 'Galerie Réalisations',
      catalogSubtitle: 'Cuisines d’art en chêne fumé, bibliothèques murales et agencements haut de gamme.',
      universeTitle: 'L’Atelier & le Savoir-Faire Ébéniste',
      universeSubtitle: 'Sélection d’essences nobles labellisées FSC et façonnage artisanal dans notre atelier lyonnais.',
      contactTitle: 'Demande de Devis & Étude 3D Gratuite',
      featuresTagline: 'SAVOIR-FAIRE UNIQUE',
      featuresHeading: 'Pourquoi confier votre agencement à SYLVA',
      featuresItems: [
        { icon: 'Award', title: 'Bois Nobles Certifiés FSC', description: 'Chêne, noyer et frêne sélectionnés pour leur grain unique et finitions écologiques durables.' },
        { icon: 'Compass', title: 'Étude 3D & Modélisation Réaliste', description: 'Visualisation de votre agencement avant lancement de la fabrication en atelier.' },
        { icon: 'ShieldCheck', title: 'Garantie Décennale Complète', description: 'Assurance professionnelle couvrant l’ensemble de nos travaux de pose et menuiserie.' }
      ],
      testimonials: [
        { author: 'Marc & Sophie V.', role: 'Propriétaires à Caluire', content: 'Une précision d’ajustement remarquable pour nos placards sous combles et la verrière en chêne.', rating: 5 },
        { author: 'Élodie D.', role: 'Architecte d’intérieur', content: 'Mon atelier de référence depuis 4 ans pour tous mes chantiers haut de gamme.', rating: 5 }
      ],
      ctaTitle: 'Vous avez un projet d’agencement en tête ?',
      ctaSubtitle: 'Contactez notre atelier pour une étude personnalisée avec plans 3D sans engagement.',
      ctaButton: 'Demander mon devis gratuit',
      ctaBg: '#1e293b'
    });
  }

  // 7. BARON — SOINS & BARBIER
  if (templateId === 'tpl-luxe-barber') {
    return buildUniversePages({
      templateId,
      brandName: 'BARON Soins',
      primaryColor: '#78350f',
      darkTheme: false,
      heroTitle: 'Le Sanctuaire du Soin Masculin & de la Coiffure d’Élite',
      heroSubtitle: 'Rituels de rasage traditionnel à l’ancienne, coupes aux ciseaux de précision et soins capillaires botaniques dans une atmosphère feutrée.',
      heroImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1400&q=80',
      catalogSlug: 'soins',
      catalogTitle: 'Carte des Soins & Tarifs',
      catalogSubtitle: 'Forfaits coupe, taille de barbe au coupe-chou et soins complets du visage.',
      universeTitle: 'L’Artisanat Barbier & l’Ambiance Privée',
      universeSubtitle: 'Fauteuils cuir vintage, serviettes chaudes parfumées et produits cosmétiques artisanaux.',
      contactTitle: 'Prise de Rendez-vous en Ligne',
      featuresTagline: 'TRADITION & ÉLÉGANCE',
      featuresHeading: 'L’expérience de soin BARON',
      featuresItems: [
        { icon: 'Award', title: 'Maîtres Barbiers Qualifiés', description: 'Techniques de coupe précises aux ciseaux et maîtrise du rasoir droit traditionnel.' },
        { icon: 'Compass', title: 'Produits 100% Botaniques', description: 'Huiles de barbe bio, baumes nourrissants et shampoings sans sulfate fabriqués en France.' },
        { icon: 'ShieldCheck', title: 'Hygiène & Confort Absolu', description: 'Stérilisation des instruments entre chaque client et serviettes en coton chaud.' }
      ],
      testimonials: [
        { author: 'Julien B.', role: 'Client régulier à Paris', content: 'Le rituel serviette chaude et massage crânien est une pure parenthèse de détente.', rating: 5 }
      ],
      ctaTitle: 'Offrez un moment d’exception',
      ctaSubtitle: 'Bons cadeaux personnalisés et réservation immédiate de créneau.',
      ctaButton: 'Prendre rendez-vous',
      ctaBg: '#27272a'
    });
  }

  // 8. GENERAL UNIVERSES FALLBACK (Justicia, Serena, Épure, Terroir, etc.)
  return buildUniversePages({
    templateId,
    brandName,
    primaryColor: '#2563eb',
    darkTheme: false,
    heroTitle: `L’Univers ${brandName}`,
    heroSubtitle: 'Des prestations d’excellence et une identité soignée pour sublimer vos projets.',
    heroImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80',
    catalogSlug: type === 'ECOMMERCE' ? 'boutique' : 'services',
    catalogTitle: type === 'ECOMMERCE' ? 'Catalogue Produits' : 'Prestations & Tarifs',
    catalogSubtitle: 'Découvrez notre gamme complète disponible immédiatement.',
    universeTitle: `Les Valeurs de la Maison ${brandName}`,
    universeSubtitle: 'Rigueur, écoute et excellence au service de votre satisfaction.',
    contactTitle: 'Contactez notre équipe',
    featuresTagline: 'ENGAGEMENTS & VALEURS',
    featuresHeading: 'Pourquoi nous faire confiance',
    featuresItems: [
      { icon: 'ShieldCheck', title: 'Garantie de Qualité', description: 'Une rigueur constante et des matériaux nobles certifiés.' },
      { icon: 'Compass', title: 'Accompagnement Dédié', description: 'Un interlocuteur unique à votre écoute pour chaque étape de votre démarche.' },
      { icon: 'Award', title: 'Service Réactif', description: 'Prise en charge rapide de vos demandes et devis transparent.' }
    ],
    testimonials: [
      { author: 'Claire M.', role: 'Cliente vérifiée', content: 'Un service d’un professionnalisme exemplaire du début à la fin.', rating: 5 }
    ],
    ctaTitle: 'Prêt à démarrer votre projet ?',
    ctaSubtitle: 'Prenez contact avec notre équipe dès aujourd’hui pour une étude personnalisée.',
    ctaButton: 'Prendre contact',
    ctaBg: '#0f172a'
  });
}

// Helper builder to generate 4 realistic pages per universe
function buildUniversePages(cfg: any) {
  const textColor = cfg.darkTheme ? '#f8fafc' : '#111827';
  const bgColor = cfg.darkTheme ? '#090d16' : '#ffffff';
  const cardBg = cfg.darkTheme ? '#0f172a' : '#ffffff';
  const cardBorder = cfg.darkTheme ? '#1e293b' : '#e2e8f0';

  const navLinks = [
    { label: 'Accueil', url: '/' },
    { label: cfg.catalogTitle, url: `/${cfg.catalogSlug}` },
    { label: 'L’Univers', url: '/univers' },
    { label: 'Contact', url: '/contact' }
  ];

  const headerSection = {
    type: 'header',
    name: 'En-tête & Navigation',
    settings: {
      brandName: cfg.brandName,
      navLinks,
      ctaButtonText: 'Nous contacter',
      ctaButtonLink: '/contact'
    },
    styles: { bgColor, textColor }
  };

  const footerSection = {
    type: 'footer',
    name: 'Pied de Page',
    settings: {
      copyright: `© ${new Date().getFullYear()} ${cfg.brandName}. Tous droits réservés. Propulsé par HELPot.`,
      columns: [
        {
          title: 'Explorer',
          links: [
            { label: 'Accueil', url: '/' },
            { label: cfg.catalogTitle, url: `/${cfg.catalogSlug}` },
            { label: 'Notre Univers', url: '/univers' }
          ]
        },
        {
          title: 'Assistance',
          links: [
            { label: 'Contact & Devis', url: '/contact' },
            { label: 'Mentions Légales', url: '/mentions-legales' }
          ]
        }
      ]
    },
    styles: { bgColor: cfg.darkTheme ? '#030712' : '#0f172a', textColor: '#94a3b8' }
  };

  return [
    // PAGE 1: ACCUEIL (LANDING)
    {
      slug: '',
      title: 'Accueil',
      is_home: 1,
      sort_order: 0,
      sections: [
        headerSection,
        {
          type: 'hero',
          name: 'Hero Banner Principal',
          settings: {
            title: cfg.heroTitle,
            subtitle: cfg.heroSubtitle,
            ctaPrimaryText: `Découvrir ${cfg.catalogTitle}`,
            ctaPrimaryLink: `/${cfg.catalogSlug}`,
            ctaSecondaryText: 'L’Univers de la marque',
            ctaSecondaryLink: '/univers',
            bgImageUrl: cfg.heroImage,
            overlayOpacity: cfg.darkTheme ? 65 : 52,
            alignment: 'center'
          },
          styles: { paddingTop: '95px', paddingBottom: '95px', textColor: '#ffffff' }
        },
        {
          type: 'features',
          name: 'Engagements & Points Forts',
          settings: {
            tagline: cfg.featuresTagline,
            heading: cfg.featuresHeading,
            items: cfg.featuresItems
          },
          styles: { paddingTop: '80px', paddingBottom: '80px', bgColor: cfg.darkTheme ? '#0b1120' : '#f8fafc' }
        },
        {
          type: 'products_grid',
          name: 'Sélection Vedette',
          settings: {
            tagline: 'SÉLECTION OFFICIELLE',
            heading: `Les Modèles Phares ${cfg.brandName}`,
            description: 'Produits testés et recommandés par nos experts.'
          },
          styles: {
            paddingTop: '80px',
            paddingBottom: '80px',
            bgColor,
            textColor,
            cardBgColor: cardBg,
            cardBorderColor: cardBorder,
            cardTextColor: textColor
          }
        },
        {
          type: 'cta_banner',
          name: 'Bannière Appel à l’Action',
          settings: {
            title: cfg.ctaTitle,
            subtitle: cfg.ctaSubtitle,
            buttonText: cfg.ctaButton,
            buttonLink: '/contact'
          },
          styles: { bgColor: cfg.ctaBg, textColor: '#ffffff', paddingTop: '70px', paddingBottom: '70px' }
        },
        {
          type: 'testimonials',
          name: 'Avis Clients & Retours',
          settings: {
            tagline: 'CONFIANCE & AVIS VÉRIFIÉS',
            heading: 'Ce que pensent nos clients',
            items: cfg.testimonials
          },
          styles: { paddingTop: '80px', paddingBottom: '80px', bgColor: cfg.darkTheme ? '#0b1120' : '#f8fafc' }
        },
        footerSection
      ]
    },

    // PAGE 2: CATALOGUE / BOUTIQUE / PRESTATIONS
    {
      slug: cfg.catalogSlug,
      title: cfg.catalogTitle,
      is_home: 0,
      sort_order: 1,
      sections: [
        headerSection,
        {
          type: 'hero_simple',
          name: `Titre Rayon ${cfg.catalogTitle}`,
          settings: {
            title: `${cfg.catalogTitle} — ${cfg.brandName}`,
            subtitle: cfg.catalogSubtitle
          },
          styles: { bgColor: cfg.darkTheme ? '#0b1120' : '#f8fafc', paddingTop: '65px', paddingBottom: '65px' }
        },
        {
          type: 'products_grid',
          name: 'Tous les Articles du Rayon',
          settings: {
            tagline: 'CATALOGUE INTÉGRAL',
            heading: 'Tous nos équipements disponibles',
            description: 'Filtrez et commandez vos articles avec expédition sécurisée.'
          },
          styles: {
            paddingTop: '60px',
            paddingBottom: '80px',
            bgColor,
            textColor,
            cardBgColor: cardBg,
            cardBorderColor: cardBorder,
            cardTextColor: textColor
          }
        },
        {
          type: 'cta_banner',
          name: 'Bannière Conseil d’Achat',
          settings: {
            title: 'Besoin d’un conseil avant de finaliser ?',
            subtitle: 'Nos conseillers spécialisés vous guident selon vos exigences.',
            buttonText: 'Échanger avec un conseiller',
            buttonLink: '/contact'
          },
          styles: { bgColor: cfg.ctaBg, textColor: '#ffffff', paddingTop: '60px', paddingBottom: '60px' }
        },
        footerSection
      ]
    },

    // PAGE 3: L'UNIVERS / HISTOIRE / ATELIER
    {
      slug: 'univers',
      title: 'Notre Univers',
      is_home: 0,
      sort_order: 2,
      sections: [
        headerSection,
        {
          type: 'hero_simple',
          name: 'Titre L’Univers',
          settings: {
            title: `L’Univers ${cfg.brandName}`,
            subtitle: cfg.universeSubtitle
          },
          styles: { bgColor: cfg.darkTheme ? '#0b1120' : '#f8fafc', paddingTop: '65px', paddingBottom: '65px' }
        },
        {
          type: 'features',
          name: 'Standards & Savoir-Faire d’Atelier',
          settings: {
            tagline: 'SAVOIR-FAIRE & EXCELLENCE',
            heading: cfg.universeTitle,
            items: cfg.featuresItems
          },
          styles: { paddingTop: '80px', paddingBottom: '80px', bgColor }
        },
        {
          type: 'testimonials',
          name: 'Témoignages & Reconnaissance',
          settings: {
            tagline: 'NOTRE HISTOIRE',
            heading: 'La satisfaction de notre communauté',
            items: cfg.testimonials
          },
          styles: { paddingTop: '80px', paddingBottom: '80px', bgColor: cfg.darkTheme ? '#0b1120' : '#f8fafc' }
        },
        footerSection
      ]
    },

    // PAGE 4: CONTACT & DEVIS
    {
      slug: 'contact',
      title: 'Contact & Devis',
      is_home: 0,
      sort_order: 3,
      sections: [
        headerSection,
        {
          type: 'hero_simple',
          name: 'Titre Page Contact',
          settings: {
            title: cfg.contactTitle,
            subtitle: 'Nous vous répondons sous 24h ouvrées. Devis clair et personnalisé.'
          },
          styles: { bgColor: cfg.darkTheme ? '#0b1120' : '#f8fafc', paddingTop: '65px', paddingBottom: '65px' }
        },
        {
          type: 'contact_form',
          name: 'Formulaire de Contact & Devis',
          settings: {
            showPhone: true,
            showProjectDetails: true,
            submitButtonText: 'Transmettre ma demande'
          },
          styles: { paddingTop: '50px', paddingBottom: '80px', bgColor }
        },
        footerSection
      ]
    }
  ];
}

// Export demo products and services generator for live previews and checkout deep-clone
export function getDemoProductsForTemplate(templateId: string): any[] {
  if (templateId === 'tpl-gamingbm-esport') {
    return [
      {
        id: 'prod-aura-1',
        title: 'PC Gamer Cyber Titan - RTX 4080 & i9',
        slug: 'pc-gamer-cyber-titan',
        description: 'Config esport ultra puissante, 32GB DDR5, SSD NVMe 2TB, Watercooling 360mm RGB.',
        price: 1999.00,
        stock: 8,
        is_featured: 1,
        category_name: 'Configs Esport',
        image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'prod-aura-2',
        title: 'Clavier Mécanique RGB Hot-Swap',
        slug: 'clavier-mecanique-rgb',
        description: 'Switches optiques ultra-rapides, châssis aluminium brossé et repose-poignet magnétique.',
        price: 129.90,
        stock: 25,
        is_featured: 1,
        category_name: 'Périphériques',
        image: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'prod-aura-3',
        title: 'Écran Esport 240Hz 27" Fast IPS',
        slug: 'ecran-esport-240hz',
        description: 'Résolution QHD 1440p, temps de réponse 0.5ms, compatible G-Sync et HDR400.',
        price: 349.00,
        stock: 14,
        is_featured: 1,
        category_name: 'Écrans',
        image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80'
      }
    ];
  }
  if (templateId === 'tpl-shopelios-energy') {
    return [
      {
        id: 'prod-ignis-1',
        title: 'Palette de Granulés de Bois DINplus (66 sacs)',
        slug: 'palette-pellets-66-sacs',
        description: '100% résineux haute performance, pouvoir calorifique > 4.9 kWh/kg, livraison par palette.',
        price: 419.00,
        stock: 30,
        is_featured: 1,
        category_name: 'Pellets & Granulés',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'prod-ignis-2',
        title: 'Bûches de Bois Compressé Jour (Pack 96 bûches)',
        slug: 'buches-bois-compresse',
        description: '100% chêne et hêtre compressés sans colle ni additif. Combustion longue durée 2h par bûche.',
        price: 389.00,
        stock: 20,
        is_featured: 1,
        category_name: 'Combustibles',
        image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'prod-ignis-3',
        title: 'Sac de Granulés à l’Unité 15kg ENplus A1',
        slug: 'sac-pellets-15kg',
        description: 'Pratique pour appoint ou tester la qualité de notre bois avant commande de palette.',
        price: 7.90,
        stock: 150,
        is_featured: 0,
        category_name: 'Pellets',
        image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80'
      }
    ];
  }
  if (templateId === 'tpl-topgart-garden') {
    return [
      {
        id: 'prod-terra-1',
        title: 'Tronçonneuse Thermique Pro 52cc - Guide 50cm',
        slug: 'tronconneuse-pro-52cc',
        description: 'Moteur 2-temps haute compression, système de démarrage facile EasyStart et double frein de chaîne.',
        price: 249.00,
        stock: 14,
        is_featured: 1,
        category_name: 'Outillage Pro',
        image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'prod-terra-2',
        title: 'Tondeuse Autotractée Mulching 160cc',
        slug: 'tondeuse-autotractee-160cc',
        description: 'Largeur de coupe 51cm, carter acier renforcé, bac de ramassage 65L et fonction éjection latérale.',
        price: 429.00,
        stock: 6,
        is_featured: 1,
        category_name: 'Tondeuses',
        image: 'https://images.unsplash.com/photo-1558904541-efa8c4a08931?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'prod-terra-3',
        title: 'Taille-Haie Sans Fil 20V Lithium',
        slug: 'taille-haie-sans-fil-20v',
        description: 'Lame double action découpée au laser 55cm, autonomie 90 min et poignée rotative 180°.',
        price: 119.00,
        stock: 20,
        is_featured: 0,
        category_name: 'Batterie 20V',
        image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
      }
    ];
  }
  if (templateId === 'tpl-lenha-design') {
    return [
      {
        id: 'prod-nordic-1',
        title: 'Poêle à Granulés Scandinave Oslo 8.5 kW',
        slug: 'poele-granules-oslo',
        description: 'Design épuré en fonte et acier corten, programmation Wi-Fi et réservoir 22kg silencieux.',
        price: 2490.00,
        stock: 5,
        is_featured: 1,
        category_name: 'Poêles à Granulés',
        image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'prod-nordic-2',
        title: 'Poêle à Bois Contemporain Vitre Galbée',
        slug: 'poele-bois-vitre-galbee',
        description: 'Rendement exceptionnel 82%, label Flamme Verte 7 étoiles, double combustion propre.',
        price: 1850.00,
        stock: 7,
        is_featured: 1,
        category_name: 'Poêles à Bois',
        image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'prod-nordic-3',
        title: 'Serviteur de Cheminée 4 Accessoires Acier Noir',
        slug: 'serviteur-cheminee-acier',
        description: 'Pinces, balai, pelle et tisonnier design sur pied lourd antidérapant.',
        price: 149.00,
        stock: 18,
        is_featured: 0,
        category_name: 'Accessoires Design',
        image: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80'
      }
    ];
  }
  if (templateId === 'tpl-hlg-appliances') {
    return [
      {
        id: 'prod-kronos-1',
        title: 'Four Encastrable Pyrolyse Chaleur Tournante Inox',
        slug: 'four-pyrolyse-inox',
        description: 'Volume XXL 73L, 12 modes de cuisson assistée, porte froide 4 vitres et fermeture douce.',
        price: 599.00,
        stock: 10,
        is_featured: 1,
        category_name: 'Fours & Cuisson',
        image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'prod-kronos-2',
        title: 'Réfrigérateur Combiné Total NoFrost 360L',
        slug: 'refrigerateur-nofrost-360l',
        description: 'Compartiment fraîcheur 0°C pour viandes/poissons, compresseur inverter silencieux 35dB.',
        price: 749.00,
        stock: 6,
        is_featured: 1,
        category_name: 'Froid & Réfrigération',
        image: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'prod-kronos-3',
        title: 'Lave-Linge Induction Silencieux 9kg A+++',
        slug: 'lave-linge-induction-9kg',
        description: 'Programme vapeur anti-allergies, pesée automatique et départ différé 24h.',
        price: 499.00,
        stock: 12,
        is_featured: 0,
        category_name: 'Lavage & Soin',
        image: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=800&q=80'
      }
    ];
  }
  if (templateId === 'tpl-minimal-mode') {
    return [
      {
        id: 'prod-epure-1',
        title: 'Manteau Droit Laine Vierge & Cachemire',
        slug: 'manteau-droit-laine-cachemire',
        description: 'Coupe droite épurée, col tailleur et finitions coutures invisibles faites à la main.',
        price: 289.00,
        stock: 10,
        is_featured: 1,
        category_name: 'Manteaux & Vestes',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'prod-epure-2',
        title: 'Sac Bandoulière Cuir Grainé Tannage Végétal',
        slug: 'sac-bandouliere-cuir-graine',
        description: 'Fermoir aimanté en laiton brossé, bandoulière réglable et doublure coton biologique.',
        price: 195.00,
        stock: 15,
        is_featured: 1,
        category_name: 'Maroquinerie',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'prod-epure-3',
        title: 'Chemise Col Officier Popeline Bio',
        slug: 'chemise-col-officier-popeline',
        description: '100% coton biologique certifié GOTS, boutons nacre véritable et coupe décontractée.',
        price: 89.00,
        stock: 35,
        is_featured: 0,
        category_name: 'Chemises',
        image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80'
      }
    ];
  }
  if (templateId === 'tpl-gourmet-bio') {
    return [
      {
        id: 'prod-terroir-1',
        title: 'Coffret Huile d’Olive AOP & Vinaigre Balsamique 12 ans',
        slug: 'coffret-huile-olive-vinaigre-12ans',
        description: 'Huile d’olive vierge extra extraite à froid en Provence et vinaigre traditionnel de Modène.',
        price: 48.00,
        stock: 25,
        is_featured: 1,
        category_name: 'Épicerie Fine',
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'prod-terroir-2',
        title: 'Miel Sauvage de Montagne Non Filtré 500g',
        slug: 'miel-sauvage-montagne-500g',
        description: 'Récolté artisanalement dans les Alpes, texture crémeuse et arômes floraux intenses.',
        price: 14.50,
        stock: 40,
        is_featured: 1,
        category_name: 'Miels & Confitures',
        image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'prod-terroir-3',
        title: 'Sélection de Chocolats Grands Crus Équateur 72%',
        slug: 'chocolats-grands-crus-72',
        description: 'Fèves rares Pure Forastero, notes boisées et fruits secs. Fabrication artisanale bean-to-bar.',
        price: 26.00,
        stock: 30,
        is_featured: 0,
        category_name: 'Chocolaterie',
        image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80'
      }
    ];
  }

  // Fallback demo products
  return [
    {
      id: 'prod-demo-1',
      title: 'Création Signature de l’Atelier',
      slug: 'creation-signature-atelier',
      description: 'L’excellence des finitions et le savoir-faire reconnu de notre marque.',
      price: 149.00,
      stock: 10,
      is_featured: 1,
      category_name: 'Nouveautés',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'prod-demo-2',
      title: 'Édition Spéciale Numérotée',
      slug: 'edition-speciale-numerotee',
      description: 'Série limitée conçue avec passion et garantie constructeur 3 ans.',
      price: 289.00,
      stock: 5,
      is_featured: 1,
      category_name: 'Éditions Limitées',
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80'
    }
  ];
}

export function getDemoServicesForTemplate(templateId: string): any[] {
  if (templateId === 'tpl-woodcraft-pro') {
    return [
      { id: 'srv-1', title: 'Conception de Cuisines Sur-Mesure', description: 'Cuisines en chêne massif et noyer, plans de travail en granit et îlots centraux intégrés.', icon: 'Utensils', price_starting_at: 4500, duration: '2 à 3 semaines' },
      { id: 'srv-2', title: 'Dressing & Bibliothèques Intégrées', description: 'Agencement optimisé du sol au plafond avec éclairages LED invisibles et ferrures amorties.', icon: 'BookOpen', price_starting_at: 2200, duration: '1 semaine' },
      { id: 'srv-3', title: 'Escaliers Hélicoïdaux & Droits', description: 'Structures d’artisanat alliant métal noir et marches en bois massif verni haute résistance.', icon: 'Layers', price_starting_at: 3800, duration: '2 semaines' }
    ];
  }
  if (templateId === 'tpl-luxe-barber') {
    return [
      { id: 'srv-1', title: 'Coupe Signature & Coiffage aux Ciseaux', description: 'Diagnostic personnalisé, shampoing massant et coiffage aux produits naturels.', icon: 'Scissors', price_starting_at: 35, duration: '45 min' },
      { id: 'srv-2', title: 'Taille de Barbe & Rasage Traditionnel', description: 'Serviette chaude parfumée aux huiles essentielles, rasoir coupe-chou et baume apaisant.', icon: 'Award', price_starting_at: 28, duration: '30 min' },
      { id: 'srv-3', title: 'Rituel Privilège Complet Homme', description: 'Coupe + taille de barbe + soin du visage purifiant et serviette fraîche.', icon: 'Sparkles', price_starting_at: 58, duration: '1h15' }
    ];
  }
  if (templateId === 'tpl-juris-lex') {
    return [
      { id: 'srv-1', title: 'Audit Juridique & Conformité Entreprise', description: 'Analyse complète des risques contractuels, sociaux et réglementaires pour dirigeants.', icon: 'ShieldCheck', price_starting_at: 650, duration: '3 à 5 jours' },
      { id: 'srv-2', title: 'Accompagnement Fusions, Cessions & Statuts', description: 'Rédaction d’actes d’avocat, pactes d’associés et opérations de restructuration.', icon: 'Compass', price_starting_at: 1800, duration: 'Sur mesure' },
      { id: 'srv-3', title: 'Consultation Stratégique & Contentieux', description: 'Stratégie de défense précontentieuse et représentation devant les juridictions.', icon: 'Award', price_starting_at: 250, duration: '1 heure' }
    ];
  }
  if (templateId === 'tpl-zen-spa') {
    return [
      { id: 'srv-1', title: 'Rituel Ayurvédique aux Huiles Chaudes 90min', description: 'Massage ancestral rééquilibrant les énergies et relâchant les tensions musculaires.', icon: 'Sparkles', price_starting_at: 120, duration: '1h30' },
      { id: 'srv-2', title: 'Soin Visage Botanique Éclat & Jeunesse', description: 'Nettoyage en profondeur, gommage aux enzymes florales et masque hydratant bio.', icon: 'Compass', price_starting_at: 85, duration: '1h00' },
      { id: 'srv-3', title: 'Accès Privatif Bains Japonais & Sauna', description: 'Bain chaud en cèdre, sauna finlandais et tisanerie biologique pour 2 personnes.', icon: 'Award', price_starting_at: 65, duration: '1h00' }
    ];
  }
  return [
    { id: 'srv-default-1', title: 'Prestation Personnalisée & Conseil', description: 'Étude complète de vos besoins avec devis détaillé sous 24h.', icon: 'Compass', price_starting_at: 150, duration: '1 jour' },
    { id: 'srv-default-2', title: 'Réalisation Complète Clé en Main', description: 'Prise en charge intégrale de la conception à la pose finale.', icon: 'Award', price_starting_at: 1200, duration: '1 semaine' }
  ];
}
