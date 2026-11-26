// Script pour initialiser le schéma et les données initiales sur votre base Turso Cloud
// Usage : npx dotenv -e .env -- node scripts/setup-turso.mjs
import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Veuillez définir TURSO_DATABASE_URL et TURSO_AUTH_TOKEN dans vos variables d'environnement.");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function initTurso() {
  console.log(`Connexion à Turso Cloud (${url})...`);

  // Create tables
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CLIENT',
      is_verified INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

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
      slug TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      headline TEXT,
      description TEXT,
      price REAL NOT NULL,
      category_id TEXT NOT NULL,
      sub_category_id TEXT,
      type TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      features_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS template_screenshots (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      page_name TEXT NOT NULL,
      image_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS template_blueprint_pages (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      is_home INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      sections_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      total_amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      status TEXT NOT NULL DEFAULT 'PAID',
      payment_gateway TEXT NOT NULL DEFAULT 'stripe_mock',
      payment_intent_id TEXT,
      promo_code TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      unit_price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_instances (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      order_item_id TEXT,
      name TEXT NOT NULL,
      subdomain_slug TEXT UNIQUE NOT NULL,
      custom_domain TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      type TEXT NOT NULL,
      global_theme_json TEXT,
      seo_meta_json TEXT,
      company_info_json TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS site_pages (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      is_home INTEGER NOT NULL DEFAULT 0,
      seo_title TEXT,
      seo_description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS site_sections (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      site_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      settings_json TEXT NOT NULL,
      styles_json TEXT
    );

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
      is_featured INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS site_services (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      price_starting_at REAL,
      duration TEXT
    );

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
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS publication_releases (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      snapshot_json TEXT NOT NULL,
      published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      note TEXT
    );
  `);

  console.log('✓ Tables Turso initialisées avec succès !');
}

initTurso().catch(console.error);
