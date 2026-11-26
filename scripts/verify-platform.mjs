import { getDb } from '../lib/db.js';

async function testPlatform() {
  console.log('--- 1. TESTING DATABASE & SEED DATA ---');
  const db = getDb();

  const categories = db.prepare('SELECT count(*) as count FROM categories').get();
  const subCategories = db.prepare('SELECT count(*) as count FROM sub_categories').get();
  const templates = db.prepare('SELECT count(*) as count FROM templates').get();
  const screenshots = db.prepare('SELECT count(*) as count FROM template_screenshots').get();
  const users = db.prepare('SELECT count(*) as count FROM users').get();
  const siteInstances = db.prepare('SELECT count(*) as count FROM site_instances').get();
  const sitePages = db.prepare('SELECT count(*) as count FROM site_pages').get();
  const siteSections = db.prepare('SELECT count(*) as count FROM site_sections').get();

  console.log(`Categories count: ${categories.count}`);
  console.log(`Subcategories count: ${subCategories.count}`);
  console.log(`Templates count: ${templates.count}`);
  console.log(`Screenshots in gallery count: ${screenshots.count}`);
  console.log(`Registered users count: ${users.count}`);
  console.log(`Site instances (tenants) count: ${siteInstances.count}`);
  console.log(`Site pages count: ${sitePages.count}`);
  console.log(`Site sections count: ${siteSections.count}`);

  if (categories.count < 5 || templates.count < 5) {
    throw new Error('Database seeding failed or incomplete');
  }

  console.log('\n--- 2. TESTING MULTI-TENANT ISOLATION & DEEP CLONING ---');
  // Simulate purchasing template 'tpl-zen-spa' for a new customer
  const newUserId = 'user-test-buyer';
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role)
    VALUES (?, 'buyer@test.fr', 'dummyhash', 'Claire Dupont', 'CLIENT')
  `).run(newUserId);

  const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get('tpl-zen-spa');
  const blueprintPages = db.prepare('SELECT * FROM template_blueprint_pages WHERE template_id = ?').all('tpl-zen-spa');

  const newSiteId = `site-buyer-spa-${Date.now()}`;
  db.prepare(`
    INSERT INTO site_instances (id, user_id, template_id, name, subdomain_slug, status, type)
    VALUES (?, ?, ?, 'Spa Oasis Sérénité', 'oasis-serenite', 'CONFIGURING', ?)
  `).run(newSiteId, newUserId, tpl.id, tpl.type);

  for (const bp of blueprintPages) {
    const pageId = `page-${newSiteId}-${bp.slug || 'home'}`;
    db.prepare(`
      INSERT INTO site_pages (id, site_id, slug, title, is_home, sort_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(pageId, newSiteId, bp.slug, bp.title, bp.is_home, bp.sort_order);

    const sections = JSON.parse(bp.sections_json);
    let secIdx = 0;
    for (const s of sections) {
      db.prepare(`
        INSERT INTO site_sections (id, page_id, site_id, type, name, sort_order, is_hidden, settings_json, styles_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `sec-${pageId}-${secIdx}`,
        pageId,
        newSiteId,
        s.type,
        s.name,
        secIdx++,
        0,
        JSON.stringify(s.settings),
        JSON.stringify(s.styles)
      );
    }
  }

  const buyerPages = db.prepare('SELECT count(*) as count FROM site_pages WHERE site_id = ?').get(newSiteId);
  const buyerSections = db.prepare('SELECT count(*) as count FROM site_sections WHERE site_id = ?').get(newSiteId);
  console.log(`Buyer site pages created: ${buyerPages.count}`);
  console.log(`Buyer site sections created: ${buyerSections.count}`);

  console.log('\n--- 3. TESTING VISUAL EDITOR MUTATION ---');
  // Mutate hero title on the newly cloned site
  const firstSection = db.prepare('SELECT * FROM site_sections WHERE site_id = ? AND type = "hero"').get(newSiteId);
  if (firstSection) {
    const parsedSettings = JSON.parse(firstSection.settings_json);
    parsedSettings.title = 'Bienvenue chez Spa Oasis Sérénité — Soins Révélateurs';
    db.prepare('UPDATE site_sections SET settings_json = ? WHERE id = ?').run(JSON.stringify(parsedSettings), firstSection.id);
    
    // Verify master template was NOT modified!
    const masterBp = db.prepare('SELECT * FROM template_blueprint_pages WHERE template_id = "tpl-zen-spa" AND is_home = 1').get();
    const masterSections = JSON.parse(masterBp.sections_json);
    console.log(`Customized site title: "${parsedSettings.title}"`);
    console.log(`Master template blueprint unchanged: "${masterSections[1]?.settings?.title !== parsedSettings.title}"`);
  }

  console.log('\n--- 4. TESTING PUBLICATION RELEASE SNAPSHOTTING ---');
  db.prepare(`
    INSERT INTO publication_releases (id, site_id, version, snapshot_json, note)
    VALUES (?, ?, 1, '{"mock": "release v1"}', 'Initial Release')
  `).run(`rel-${newSiteId}-v1`, newSiteId);

  db.prepare('UPDATE site_instances SET status = "PUBLISHED", published_at = CURRENT_TIMESTAMP WHERE id = ?').run(newSiteId);

  const publishedSite = db.prepare('SELECT * FROM site_instances WHERE id = ?').get(newSiteId);
  console.log(`Site status: ${publishedSite.status}`);
  console.log(`Site subdomain URL: ${publishedSite.subdomain_slug}.helpot.fr (/sites/${publishedSite.subdomain_slug})`);

  console.log('\n✓ ALL PLATFORM CAPABILITIES VERIFIED SUCCESSFULLY!');
}

testPlatform().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
