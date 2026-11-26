import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser, verifySiteAccess } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const hasAccess = await verifySiteAccess(id, user);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Accès non autorisé à ce site' }, { status: 403 });
    }

    const db = getDb();
    const site = db.prepare(`
      SELECT s.*, t.name as template_name, t.type as template_type
      FROM site_instances s
      LEFT JOIN templates t ON s.template_id = t.id
      WHERE s.id = ?
    `).get(id) as any;

    if (!site) {
      return NextResponse.json({ error: 'Site introuvable' }, { status: 404 });
    }

    // Pages available in this site instance
    const pages = db.prepare(`
      SELECT * FROM site_pages
      WHERE site_id = ?
      ORDER BY sort_order ASC
    `).all(id) as any[];

    // Business catalog & services available in this site instance
    const products = db.prepare(`
      SELECT * FROM site_products
      WHERE site_id = ?
      ORDER BY is_featured DESC, title ASC
    `).all(id) as any[];

    const services = db.prepare(`
      SELECT * FROM site_services
      WHERE site_id = ?
      ORDER BY title ASC
    `).all(id) as any[];

    return NextResponse.json({
      site: {
        ...site,
        globalTheme: site.global_theme_json ? JSON.parse(site.global_theme_json) : {},
        seoMeta: site.seo_meta_json ? JSON.parse(site.seo_meta_json) : {},
        companyInfo: site.company_info_json ? JSON.parse(site.company_info_json) : {},
        products,
        services
      },
      pages
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update site instance general settings (theme, SEO, company info, subdomain)
export async function PUT(
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

    const body = await request.json();
    const { name, subdomain_slug, custom_domain, globalTheme, seoMeta, companyInfo } = body;

    const db = getDb();

    // Check subdomain uniqueness if changed
    if (subdomain_slug) {
      const existing = db.prepare('SELECT id FROM site_instances WHERE subdomain_slug = ? AND id != ?').get(subdomain_slug, id);
      if (existing) {
        return NextResponse.json({ error: 'Ce sous-domaine est déjà réservé par un autre site' }, { status: 409 });
      }
    }

    db.prepare(`
      UPDATE site_instances SET
        name = COALESCE(?, name),
        subdomain_slug = COALESCE(?, subdomain_slug),
        custom_domain = COALESCE(?, custom_domain),
        global_theme_json = COALESCE(?, global_theme_json),
        seo_meta_json = COALESCE(?, seo_meta_json),
        company_info_json = COALESCE(?, company_info_json),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || null,
      subdomain_slug || null,
      custom_domain || null,
      globalTheme ? JSON.stringify(globalTheme) : null,
      seoMeta ? JSON.stringify(seoMeta) : null,
      companyInfo ? JSON.stringify(companyInfo) : null,
      id
    );

    return NextResponse.json({ success: true, message: 'Paramètres mis à jour' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
