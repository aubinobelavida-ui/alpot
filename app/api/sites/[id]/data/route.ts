import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser, verifySiteAccess } from '@/lib/auth';

// GET: Fetch products, services, and form submissions for a site
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const hasAccess = await verifySiteAccess(id, user);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const db = getDb();
    const products = db.prepare('SELECT * FROM site_products WHERE site_id = ? ORDER BY title ASC').all(id);
    const services = db.prepare('SELECT * FROM site_services WHERE site_id = ? ORDER BY title ASC').all(id);
    const submissions = db.prepare('SELECT * FROM site_form_submissions WHERE site_id = ? ORDER BY created_at DESC').all(id);

    return NextResponse.json({ products, services, submissions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add new product, service, or handle public form submission
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { entityType, data } = body;
    const db = getDb();

    // If public contact form submission (does not require auth!)
    if (entityType === 'form_submission') {
      const subId = `lead-${Date.now()}`;
      db.prepare(`
        INSERT INTO site_form_submissions (id, site_id, form_type, name, email, phone, message, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        subId,
        id,
        data.form_type || 'contact',
        data.name || '',
        data.email || '',
        data.phone || '',
        data.message || '',
        JSON.stringify(data)
      );
      return NextResponse.json({ success: true, message: 'Message transmis avec succès' });
    }

    // Other entities (products, services) require ownership
    const user = await getCurrentUser();
    const hasAccess = await verifySiteAccess(id, user);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    if (entityType === 'product') {
      const prodId = `prod-${Date.now()}`;
      db.prepare(`
        INSERT INTO site_products (id, site_id, title, slug, description, price, compare_price, stock, is_featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        prodId,
        id,
        data.title,
        data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        data.description || '',
        data.price || 0,
        data.compare_price || null,
        data.stock || 10,
        data.is_featured ? 1 : 0
      );
      return NextResponse.json({ success: true, productId: prodId });
    }

    if (entityType === 'service') {
      const srvId = `srv-${Date.now()}`;
      db.prepare(`
        INSERT INTO site_services (id, site_id, title, description, icon, price_starting_at, duration)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        srvId,
        id,
        data.title,
        data.description || '',
        data.icon || 'Star',
        data.price_starting_at || null,
        data.duration || ''
      );
      return NextResponse.json({ success: true, serviceId: srvId });
    }

    return NextResponse.json({ error: 'Type d’entité non supporté' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
