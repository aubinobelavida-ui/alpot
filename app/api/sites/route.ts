import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET: List all sites owned by the authenticated user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const db = getDb();
    let query = `
      SELECT s.*, t.name as template_name, t.thumbnail_url as template_thumbnail
      FROM site_instances s
      LEFT JOIN templates t ON s.template_id = t.id
    `;
    const params: any[] = [];

    // Normal client sees only their own sites; Admin sees all
    if (user.role !== 'ADMIN') {
      query += ` WHERE s.user_id = ?`;
      params.push(user.id);
    }

    query += ` ORDER BY s.created_at DESC`;

    const sites = db.prepare(query).all(...params) as any[];

    const formatted = sites.map(s => ({
      ...s,
      globalTheme: s.global_theme_json ? JSON.parse(s.global_theme_json) : {},
      seoMeta: s.seo_meta_json ? JSON.parse(s.seo_meta_json) : {},
      companyInfo: s.company_info_json ? JSON.parse(s.company_info_json) : {}
    }));

    // Overview statistics for dashboard
    const stats = {
      totalSites: formatted.length,
      configuring: formatted.filter(s => s.status === 'CONFIGURING' || s.status === 'DRAFT').length,
      published: formatted.filter(s => s.status === 'PUBLISHED').length,
    };

    return NextResponse.json({ sites: formatted, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
