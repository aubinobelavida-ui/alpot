import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
    }

    const db = getDb();

    // 1. Overview counts
    const totalTemplates = (db.prepare('SELECT count(*) as count FROM templates').get() as any).count;
    const totalClients = (db.prepare('SELECT count(*) as count FROM users WHERE role = "CLIENT"').get() as any).count;
    const totalSites = (db.prepare('SELECT count(*) as count FROM site_instances').get() as any).count;
    const publishedSites = (db.prepare('SELECT count(*) as count FROM site_instances WHERE status = "PUBLISHED"').get() as any).count;

    // 2. Financials
    const ordersResult = db.prepare('SELECT SUM(total_amount) as revenue, COUNT(*) as count FROM orders WHERE status = "PAID"').get() as any;
    const totalRevenue = ordersResult?.revenue || 0;
    const totalOrders = ordersResult?.count || 0;

    // 3. Recent orders list
    const recentOrders = db.prepare(`
      SELECT o.*, u.full_name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `).all();

    // 4. Clients list
    const clients = db.prepare(`
      SELECT u.id, u.email, u.full_name, u.created_at,
             COUNT(s.id) as sites_count
      FROM users u
      LEFT JOIN site_instances s ON u.id = s.user_id
      WHERE u.role = 'CLIENT'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();

    // 5. Templates catalog for management
    const templates = db.prepare(`
      SELECT t.*, c.name as category_name, COUNT(oi.id) as sales_count
      FROM templates t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN order_items oi ON t.id = oi.template_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `).all();

    return NextResponse.json({
      metrics: {
        totalTemplates,
        totalClients,
        totalSites,
        publishedSites,
        totalRevenue,
        totalOrders
      },
      recentOrders,
      clients,
      templates
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
