import { NextResponse } from 'next/server';
import { getDb, getDemoProductsForTemplate, getDemoServicesForTemplate } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    // Query by ID or slug
    const template = db.prepare(`
      SELECT t.*, c.name as category_name, sc.name as sub_category_name
      FROM templates t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN sub_categories sc ON t.sub_category_id = sc.id
      WHERE t.id = ? OR t.slug = ?
    `).get(id, id) as any;

    if (!template) {
      return NextResponse.json({ error: 'Template introuvable' }, { status: 404 });
    }

    // Fetch up to 10 screenshots gallery
    const screenshots = db.prepare(`
      SELECT * FROM template_screenshots
      WHERE template_id = ?
      ORDER BY sort_order ASC
    `).all(template.id) as any[];

    // Fetch blueprint pages with sections AST for live preview & deep-cloning
    const blueprintPages = db.prepare(`
      SELECT id, slug, title, is_home, sort_order, sections_json
      FROM template_blueprint_pages
      WHERE template_id = ?
      ORDER BY sort_order ASC
    `).all(template.id) as any[];

    const formattedPages = blueprintPages.map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      is_home: p.is_home,
      sort_order: p.sort_order,
      sections: p.sections_json ? JSON.parse(p.sections_json) : []
    }));

    // Demo catalog items tailored to this template's universe
    const demoProducts = getDemoProductsForTemplate(template.id);
    const demoServices = getDemoServicesForTemplate(template.id);

    return NextResponse.json({
      template: {
        ...template,
        features: template.features_json ? JSON.parse(template.features_json) : []
      },
      screenshots,
      availablePages: formattedPages,
      demoProducts,
      demoServices
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
