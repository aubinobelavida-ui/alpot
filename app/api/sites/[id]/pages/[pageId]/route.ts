import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser, verifySiteAccess } from '@/lib/auth';

// GET: Fetch page data and all its sections
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const { id, pageId } = await params;
    const user = await getCurrentUser();
    const hasAccess = await verifySiteAccess(id, user);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const db = getDb();
    const page = db.prepare('SELECT * FROM site_pages WHERE id = ? AND site_id = ?').get(pageId, id) as any;
    if (!page) {
      return NextResponse.json({ error: 'Page introuvable' }, { status: 404 });
    }

    const sections = db.prepare(`
      SELECT * FROM site_sections
      WHERE page_id = ? AND site_id = ?
      ORDER BY sort_order ASC
    `).all(pageId, id) as any[];

    const formattedSections = sections.map(s => ({
      ...s,
      settings: s.settings_json ? JSON.parse(s.settings_json) : {},
      styles: s.styles_json ? JSON.parse(s.styles_json) : {}
    }));

    return NextResponse.json({
      page,
      sections: formattedSections
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Save updated sections (order, settings, additions, deletions, styles)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  try {
    const { id, pageId } = await params;
    const user = await getCurrentUser();
    const hasAccess = await verifySiteAccess(id, user);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { sections } = body;

    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: 'Format de sections invalide' }, { status: 400 });
    }

    const db = getDb();

    // Transactional update: replace sections with the new updated state
    db.exec('BEGIN TRANSACTION;');

    try {
      db.prepare('DELETE FROM site_sections WHERE page_id = ? AND site_id = ?').run(pageId, id);

      const insSec = db.prepare(`
        INSERT INTO site_sections (id, page_id, site_id, type, name, sort_order, is_hidden, settings_json, styles_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let order = 0;
      for (const s of sections) {
        const secId = s.id || `sec-${pageId}-${Date.now()}-${order}`;
        insSec.run(
          secId,
          pageId,
          id,
          s.type,
          s.name || s.type,
          order++,
          s.is_hidden ? 1 : 0,
          JSON.stringify(s.settings || {}),
          JSON.stringify(s.styles || {})
        );
      }

      // Update site's updated_at
      db.prepare('UPDATE site_instances SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

      db.exec('COMMIT;');
      return NextResponse.json({ success: true, count: sections.length });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
