import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser, verifySiteAccess } from '@/lib/auth';

export async function POST(
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
    const site = db.prepare('SELECT * FROM site_instances WHERE id = ?').get(id) as any;

    if (!site) {
      return NextResponse.json({ error: 'Site introuvable' }, { status: 404 });
    }

    // Validation checks
    const pages = db.prepare('SELECT * FROM site_pages WHERE site_id = ?').all(id) as any[];
    if (pages.length === 0) {
      return NextResponse.json({ error: 'Le site doit comporter au moins une page pour être publié' }, { status: 400 });
    }

    // Build complete immutable release snapshot
    const pagesWithSections = pages.map(p => {
      const sections = db.prepare('SELECT * FROM site_sections WHERE page_id = ? ORDER BY sort_order ASC').all(p.id) as any[];
      return {
        ...p,
        sections: sections.map(s => ({
          ...s,
          settings: s.settings_json ? JSON.parse(s.settings_json) : {},
          styles: s.styles_json ? JSON.parse(s.styles_json) : {}
        }))
      };
    });

    const products = db.prepare('SELECT * FROM site_products WHERE site_id = ?').all(id);
    const services = db.prepare('SELECT * FROM site_services WHERE site_id = ?').all(id);

    const snapshot = {
      siteInfo: {
        id: site.id,
        name: site.name,
        subdomain_slug: site.subdomain_slug,
        type: site.type,
        globalTheme: site.global_theme_json ? JSON.parse(site.global_theme_json) : {},
        seoMeta: site.seo_meta_json ? JSON.parse(site.seo_meta_json) : {},
        companyInfo: site.company_info_json ? JSON.parse(site.company_info_json) : {}
      },
      pages: pagesWithSections,
      products,
      services,
      snapshotTimestamp: new Date().toISOString()
    };

    // Determine new version number
    const lastRelease = db.prepare('SELECT MAX(version) as maxVer FROM publication_releases WHERE site_id = ?').get(id) as { maxVer: number | null };
    const nextVersion = (lastRelease?.maxVer || 0) + 1;

    const releaseId = `rel-${id}-v${nextVersion}`;

    db.prepare(`
      INSERT INTO publication_releases (id, site_id, version, snapshot_json, published_at, note)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `).run(releaseId, id, nextVersion, JSON.stringify(snapshot), `Publication v${nextVersion}`);

    // Update site instance status
    db.prepare(`
      UPDATE site_instances SET
        status = 'PUBLISHED',
        published_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    const publicUrl = `/sites/${site.subdomain_slug}`;

    return NextResponse.json({
      success: true,
      version: nextVersion,
      publicUrl,
      subdomain: site.subdomain_slug,
      message: 'Félicitations ! Votre site est en ligne et accessible publiquement.'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
