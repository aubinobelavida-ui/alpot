import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser, hashPassword, signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, promoCode, userCredentials, siteCustomNames } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Le panier est vide' }, { status: 400 });
    }

    const db = getDb();
    let user = await getCurrentUser();
    const cookieStore = await cookies();

    // If user is not logged in, auto-create account or login with provided credentials
    if (!user) {
      if (!userCredentials?.email || !userCredentials?.password || !userCredentials?.fullName) {
        return NextResponse.json({
          error: 'Veuillez vous connecter ou renseigner vos coordonnées pour finaliser l’achat'
        }, { status: 401 });
      }

      const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(userCredentials.email.toLowerCase().trim()) as any;
      if (existingUser) {
        // Log in the existing user
        user = {
          id: existingUser.id,
          email: existingUser.email,
          fullName: existingUser.full_name,
          role: existingUser.role
        };
      } else {
        // Auto-create new client account
        const newUserId = `user-${Date.now()}`;
        db.prepare(`
          INSERT INTO users (id, email, password_hash, full_name, role)
          VALUES (?, ?, ?, ?, 'CLIENT')
        `).run(
          newUserId,
          userCredentials.email.toLowerCase().trim(),
          hashPassword(userCredentials.password),
          userCredentials.fullName
        );

        user = {
          id: newUserId,
          email: userCredentials.email.toLowerCase().trim(),
          fullName: userCredentials.fullName,
          role: 'CLIENT'
        };
      }

      // Set cookie session
      const token = signToken(user);
      cookieStore.set('helpot_session', token, {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7
      });
    }

    // Calculate total amount with templates from DB
    let subtotal = 0;
    const templateRows: any[] = [];
    for (const item of items) {
      const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(item.templateId) as any;
      if (tpl) {
        subtotal += tpl.price;
        templateRows.push(tpl);
      }
    }

    let discount = 0;
    if (promoCode?.toUpperCase() === 'WELCOME10') discount = subtotal * 0.10;
    if (promoCode?.toUpperCase() === 'HELPOT20') discount = subtotal * 0.20;
    const totalAmount = Math.max(0, subtotal - discount);

    // Create Order
    const orderId = `ord-${Date.now()}`;
    const paymentIntentId = `pi_mock_${Math.random().toString(36).substring(2, 12)}`;

    db.prepare(`
      INSERT INTO orders (id, user_id, total_amount, currency, status, payment_gateway, payment_intent_id, promo_code)
      VALUES (?, ?, ?, 'EUR', 'PAID', 'stripe_mock', ?, ?)
    `).run(orderId, user.id, totalAmount, paymentIntentId, promoCode || null);

    // Deep-clone and provision independent site instance for each purchased template
    const createdSites: any[] = [];

    for (const tpl of templateRows) {
      const orderItemId = `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      db.prepare(`
        INSERT INTO order_items (id, order_id, template_id, unit_price)
        VALUES (?, ?, ?, ?)
      `).run(orderItemId, orderId, tpl.id, tpl.price);

      // Unique site instance
      const siteId = `site-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const customName = siteCustomNames?.[tpl.id] || tpl.name.split('—')[0].trim() || 'Mon Nouveau Site';
      const cleanSlug = customName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const uniqueSubdomain = `${cleanSlug}-${Math.floor(100 + Math.random() * 900)}`;

      db.prepare(`
        INSERT INTO site_instances (
          id, user_id, template_id, order_item_id, name, subdomain_slug,
          status, type, global_theme_json, seo_meta_json, company_info_json
        ) VALUES (?, ?, ?, ?, ?, ?, 'CONFIGURING', ?, ?, ?, ?)
      `).run(
        siteId,
        user.id,
        tpl.id,
        orderItemId,
        customName,
        uniqueSubdomain,
        tpl.type,
        JSON.stringify({ primaryColor: '#2563eb', secondaryColor: '#0f172a', font: 'Inter', radius: '8px' }),
        JSON.stringify({ title: `${customName} — Site Officiel`, description: tpl.headline || '' }),
        JSON.stringify({ companyName: customName, email: user.email, phone: '' })
      );

      // Deep clone blueprint pages & sections
      const blueprintPages = db.prepare('SELECT * FROM template_blueprint_pages WHERE template_id = ? ORDER BY sort_order ASC').all(tpl.id) as any[];

      let pIdx = 0;
      for (const bp of blueprintPages) {
        const pageId = `page-${siteId}-${bp.slug || 'home'}`;
        db.prepare(`
          INSERT INTO site_pages (id, site_id, slug, title, is_home, sort_order, is_published)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `).run(pageId, siteId, bp.slug, bp.title, bp.is_home, pIdx++);

        // Clone sections
        const sections = JSON.parse(bp.sections_json || '[]');
        let sIdx = 0;
        for (const s of sections) {
          db.prepare(`
            INSERT INTO site_sections (id, page_id, site_id, type, name, sort_order, is_hidden, settings_json, styles_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            `sec-${pageId}-${sIdx}`,
            pageId,
            siteId,
            s.type,
            s.name,
            sIdx,
            0,
            JSON.stringify(s.settings || {}),
            JSON.stringify(s.styles || {})
          );
          sIdx++;
        }
      }

      // Provision sample business data tailored to the template theme
      if (tpl.id === 'tpl-gamingbm-esport') {
        db.prepare(`
          INSERT INTO site_products (id, site_id, title, slug, description, price, stock, is_featured)
          VALUES 
          ('prod-1-' || ?, ?, 'PC Gamer Cyber Titan - RTX 4080 & i9', 'pc-gamer-cyber-titan', 'Config esport ultra puissante, 32GB DDR5, SSD NVMe 2TB, Watercooling 360mm RGB.', 1999.00, 8, 1),
          ('prod-2-' || ?, ?, 'Clavier Mécanique RGB Hot-Swap', 'clavier-mecanique-rgb', 'Switches optiques ultra-rapides, châssis aluminium brossé et repose-poignet magnétique.', 129.90, 25, 1),
          ('prod-3-' || ?, ?, 'Écran Esport 240Hz 27" Fast IPS', 'ecran-esport-240hz', 'Résolution QHD 1440p, temps de réponse 0.5ms, compatible G-Sync et HDR400.', 349.00, 15, 1)
        `).run(siteId, siteId, siteId, siteId, siteId, siteId);
      } else if (tpl.id === 'tpl-topgart-garden') {
        db.prepare(`
          INSERT INTO site_products (id, site_id, title, slug, description, price, stock, is_featured)
          VALUES 
          ('prod-1-' || ?, ?, 'Tronçonneuse Thermique Pro 52cc - Guide 50cm', 'tronconneuse-pro-52cc', 'Moteur 2-temps haute compression, système de démarrage facile EasyStart et double frein de chaîne.', 249.00, 14, 1),
          ('prod-2-' || ?, ?, 'Tondeuse Autotractée Mulching 160cc', 'tondeuse-autotractee-160cc', 'Largeur de coupe 51cm, carter acier renforcé, bac de ramassage 65L et fonction éjection latérale.', 429.00, 6, 1),
          ('prod-3-' || ?, ?, 'Taille-Haie Sans Fil 20V Lithium', 'taille-haie-sans-fil-20v', 'Lame double action découpée au laser 55cm, autonomie 90 min et poignée rotative 180°.', 119.00, 20, 1)
        `).run(siteId, siteId, siteId, siteId, siteId, siteId);
      } else if (tpl.id === 'tpl-shopelios-energy') {
        db.prepare(`
          INSERT INTO site_products (id, site_id, title, slug, description, price, stock, is_featured)
          VALUES 
          ('prod-1-' || ?, ?, 'Palette de Granulés de Bois DINplus (66 sacs)', 'palette-pellets-66-sacs', '100% résineux haute performance, pouvoir calorifique > 4.9 kWh/kg, taux de cendre < 0.5%. Livraison avec déchargement.', 419.00, 30, 1),
          ('prod-2-' || ?, ?, 'Bûches de Bois Compressé Jour (Pack 96 bûches)', 'buches-bois-compresse', '100% chêne et hêtre compressés sans colle ni additif. Combustion longue durée 2h par bûche.', 389.00, 20, 1),
          ('prod-3-' || ?, ?, 'Sac de Granulés à l’Unité 15kg ENplus A1', 'sac-pellets-15kg', 'Pratique pour appoint ou tester la qualité de notre bois avant commande de palette.', 7.90, 150, 0)
        `).run(siteId, siteId, siteId, siteId, siteId, siteId);
      } else if (tpl.id === 'tpl-lenha-design') {
        db.prepare(`
          INSERT INTO site_products (id, site_id, title, slug, description, price, stock, is_featured)
          VALUES 
          ('prod-1-' || ?, ?, 'Poêle à Granulés Scandinave Oslo 8.5 kW', 'poele-granules-oslo', 'Design épuré en fonte et acier corten, programmation Wi-Fi et réservoir 22kg silencieux.', 2490.00, 5, 1),
          ('prod-2-' || ?, ?, 'Poêle à Bois Contemporain Vitre Galbée', 'poele-bois-vitre-galbee', 'Rendement exceptionnel 82%, label Flamme Verte 7 étoiles, double combustion propre.', 1850.00, 7, 1),
          ('prod-3-' || ?, ?, 'Serviteur de Cheminée 4 Accessoires Acier Noir', 'serviteur-cheminee-acier', 'Pinces, balai, pelle et tisonnier design sur pied lourd antidérapant.', 149.00, 18, 1)
        `).run(siteId, siteId, siteId, siteId, siteId, siteId);
      } else if (tpl.id === 'tpl-hlg-appliances') {
        db.prepare(`
          INSERT INTO site_products (id, site_id, title, slug, description, price, stock, is_featured)
          VALUES 
          ('prod-1-' || ?, ?, 'Four Encastrable Pyrolyse Chaleur Tournante Inox', 'four-pyrolyse-inox', 'Volume XXL 73L, 12 modes de cuisson assistée, porte froide 4 vitres et fermeture douce.', 599.00, 10, 1),
          ('prod-2-' || ?, ?, 'Réfrigérateur Combiné Total NoFrost 360L', 'refrigerateur-nofrost-360l', 'Compartiment fraîcheur 0°C pour viandes/poissons, compresseur inverter silencieux 35dB.', 749.00, 6, 1),
          ('prod-3-' || ?, ?, 'Lave-Linge Induction Silencieux 9kg A+++', 'lave-linge-induction-9kg', 'Programme vapeur anti-allergies, pesée automatique et départ différé 24h.', 499.00, 12, 1)
        `).run(siteId, siteId, siteId, siteId, siteId, siteId);
      } else if (tpl.type === 'ECOMMERCE' || tpl.type === 'HYBRID') {
        db.prepare(`
          INSERT INTO site_products (id, site_id, title, slug, description, price, stock, is_featured)
          VALUES 
          ('prod-1-' || ?, ?, 'Produit Signature Prestige', 'produit-signature', 'Excellence des matériaux et finition soignée.', 49.90, 25, 1),
          ('prod-2-' || ?, ?, 'Édition Spéciale Atelier', 'edition-speciale', 'Série limitée conçue avec passion.', 79.00, 12, 1)
        `).run(siteId, siteId, siteId, siteId);
      } else {
        db.prepare(`
          INSERT INTO site_services (id, site_id, title, description, icon, price_starting_at, duration)
          VALUES 
          ('srv-1-' || ?, ?, 'Prestation Personnalisée & Conseil', 'Étude complète de vos besoins avec devis détaillé sous 24h.', 'Compass', 150, '1 jour'),
          ('srv-2-' || ?, ?, 'Réalisation Complète Clé en Main', 'Prise en charge intégrale de la conception à la pose finale.', 'Award', 1200, '1 semaine')
        `).run(siteId, siteId, siteId, siteId);
      }

      createdSites.push({
        siteId,
        name: customName,
        subdomain: uniqueSubdomain,
        templateName: tpl.name
      });
    }

    return NextResponse.json({
      success: true,
      orderId,
      totalAmount,
      createdSites,
      message: 'Achat validé avec succès. Vos espaces de travail sont prêts !'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
