import React from 'react';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import SectionRenderer from '@/components/editor/SectionRenderer';
import Link from 'next/link';
import { Sparkles, Globe, Phone, Mail, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PublicPublishedSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { slug } = await params;
  const { p: pageSlug } = await searchParams;
  const db = getDb();

  // 1. Find site instance by subdomain slug or custom domain
  const site = db.prepare(`
    SELECT * FROM site_instances
    WHERE subdomain_slug = ? OR custom_domain = ?
  `).get(slug, slug) as any;

  if (!site) {
    notFound();
  }

  // 2. Fetch pages for this site
  const pages = db.prepare(`
    SELECT * FROM site_pages
    WHERE site_id = ? AND is_published = 1
    ORDER BY sort_order ASC
  `).all(site.id) as any[];

  if (pages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ce site n’a pas encore été configuré</h1>
          <p className="text-slate-500 mt-2">Le propriétaire est actuellement en train de préparer ses pages.</p>
        </div>
      </div>
    );
  }

  // Determine active page
  let activePage = pages[0];
  if (pageSlug) {
    const found = pages.find((p: any) => p.slug === pageSlug);
    if (found) activePage = found;
  }

  // 3. Fetch sections for active page
  const sections = db.prepare(`
    SELECT * FROM site_sections
    WHERE page_id = ? AND site_id = ? AND is_hidden = 0
    ORDER BY sort_order ASC
  `).all(activePage.id, site.id) as any[];

  const formattedSections = sections.map((s: any) => ({
    ...s,
    settings: s.settings_json ? JSON.parse(s.settings_json) : {},
    styles: s.styles_json ? JSON.parse(s.styles_json) : {}
  }));

  // Fetch business products or services for data bindings
  const products = db.prepare('SELECT * FROM site_products WHERE site_id = ?').all(site.id);
  const services = db.prepare('SELECT * FROM site_services WHERE site_id = ?').all(site.id);

  const globalTheme = site.global_theme_json ? JSON.parse(site.global_theme_json) : {};
  const companyInfo = site.company_info_json ? JSON.parse(site.company_info_json) : {};

  return (
    <div className="min-h-screen flex flex-col bg-white">
      
      {/* Top HELPot temporary site banner */}
      <div className="bg-slate-900 text-slate-300 text-[11px] py-1 px-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Site propulsé par <strong>HELPot</strong> — Hébergé à l'adresse <code>{site.subdomain_slug}.helpot.fr</code></span>
        </div>
        <Link href="/" className="text-blue-400 hover:text-white font-semibold underline">
          Créer un site similaire
        </Link>
      </div>

      {/* Published Site Content */}
      <main className="flex-1">
        {formattedSections.map((section: any) => (
          <SectionRenderer
            key={section.id}
            section={section}
            siteTheme={globalTheme}
            siteData={{ products, services }}
            isEditor={false}
          />
        ))}
      </main>

    </div>
  );
}
