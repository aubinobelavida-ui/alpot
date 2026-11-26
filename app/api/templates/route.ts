import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const search = searchParams.get('q');
    const sort = searchParams.get('sort');

    const db = getDb();
    let query = `
      SELECT t.*, c.name as category_name, sc.name as sub_category_name
      FROM templates t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN sub_categories sc ON t.sub_category_id = sc.id
      WHERE t.is_active = 1
    `;
    const params: any[] = [];

    if (category) {
      query += ` AND t.category_id = ?`;
      params.push(category);
    }
    if (subcategory) {
      query += ` AND t.sub_category_id = ?`;
      params.push(subcategory);
    }
    if (search) {
      query += ` AND (t.name LIKE ? OR t.headline LIKE ? OR t.description LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (sort === 'price_asc') {
      query += ` ORDER BY t.price ASC`;
    } else if (sort === 'price_desc') {
      query += ` ORDER BY t.price DESC`;
    } else {
      query += ` ORDER BY t.created_at DESC`;
    }

    const templates = db.prepare(query).all(...params) as any[];

    // Parse features JSON for each template
    const formatted = templates.map(t => ({
      ...t,
      features: t.features_json ? JSON.parse(t.features_json) : []
    }));

    // Fetch categories and subcategories for the navigation menu
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all() as any[];
    const subCategories = db.prepare('SELECT * FROM sub_categories ORDER BY name ASC').all() as any[];

    const categoriesWithSubs = categories.map(c => ({
      ...c,
      subs: subCategories.filter(s => s.category_id === c.id)
    }));

    return NextResponse.json({
      templates: formatted,
      categories: categoriesWithSubs
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add new template (Admin only)
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
    }

    const body = await request.json();
    const { name, headline, description, price, category_id, sub_category_id, type, thumbnail_url, features, screenshots } = body;

    if (!name || !price || !category_id || !thumbnail_url) {
      return NextResponse.json({ error: 'Informations obligatoires manquantes' }, { status: 400 });
    }

    const db = getDb();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const id = `tpl-${Date.now()}`;

    db.prepare(`
      INSERT INTO templates (id, name, slug, headline, description, price, category_id, sub_category_id, type, thumbnail_url, features_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, name, slug, headline || '', description || '', price, category_id, sub_category_id || null, type || 'SERVICE_SHOWCASE',
      thumbnail_url, JSON.stringify(features || [])
    );

    // Insert screenshots if provided
    if (Array.isArray(screenshots)) {
      const insScr = db.prepare('INSERT INTO template_screenshots (id, template_id, page_name, image_url, sort_order) VALUES (?, ?, ?, ?, ?)');
      screenshots.forEach((s: any, idx: number) => {
        insScr.run(`scr-${id}-${idx}`, id, s.page_name || `Page ${idx + 1}`, s.image_url, idx);
      });
    }

    return NextResponse.json({ success: true, templateId: id, slug });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
