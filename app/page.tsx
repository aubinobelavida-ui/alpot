import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Sparkles, 
  Search, 
  CheckCircle2, 
  Layers, 
  Hammer, 
  Briefcase, 
  ShoppingBag, 
  Palette, 
  Star,
  ExternalLink,
  Zap,
  Sliders,
  Check,
  Eye
} from 'lucide-react';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; subcategory?: string; q?: string }>;
}) {
  const { category, subcategory, q } = await searchParams;
  const db = getDb();

  // Fetch categories with their subcategories
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all() as any[];
  const subCategories = db.prepare('SELECT * FROM sub_categories ORDER BY name ASC').all() as any[];

  // Fetch templates
  let query = `
    SELECT t.*, c.name as category_name, sc.name as sub_category_name
    FROM templates t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN sub_categories sc ON t.sub_category_id = sc.id
    WHERE t.is_active = 1
  `;
  const params: any[] = [];

  if (category) {
    query += ` AND t.category_id = ?`;
    params.push(category);
  }
  if (subcategory) {
    query += ` AND t.sub_category_id = ?`;
    params.push(subcategory);
  }
  if (q) {
    query += ` AND (t.name LIKE ? OR t.headline LIKE ? OR t.description LIKE ?)`;
    const s = `%${q}%`;
    params.push(s, s, s);
  }

  query += ` ORDER BY t.created_at DESC`;

  const templates = db.prepare(query).all(...params) as any[];

  const categoryIcons: Record<string, any> = {
    'metiers-artisanat': Hammer,
    'services-pro': Briefcase,
    'beaute-bien-etre': Sparkles,
    'ecommerce': ShoppingBag,
    'autres-secteurs': Layers
  };

  return (
    <div className="space-y-24 pb-20">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-blue-50/70 via-white to-slate-50 border-b border-slate-200/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 text-blue-700 text-xs sm:text-sm font-semibold border border-blue-200/80 shadow-sm">
              <Sparkles className="w-4 h-4 text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
              Marketplace de Templates Web Professionnels & Personnalisables
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Votre site professionnel, <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent">déjà conçu</span>.
            </h1>

            {/* Sub-headline */}
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal">
              Personnalisez-le à votre image et lancez votre activité en toute autonomie.
              Découvrez des sites complets créés pour votre métier, modifiables sans coder et prêts à être publiés.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a
                href="#catalogue"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all group"
              >
                <span>Découvrir les templates</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="#categories"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-base border border-slate-200 shadow-sm hover:border-slate-300 transition-all"
              >
                <span>Trouver mon modèle</span>
              </a>
            </div>

            {/* Highlights bullet points */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-8 text-xs sm:text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sans engagement ni code
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Éditeur visuel 3 panneaux inclus
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Sous-domaine et publication instantanée
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 2. SECTION CATÉGORIES DE MÉTIERS */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Secteurs & Métiers</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Des templates préconçus pour votre secteur
            </h2>
            <p className="text-slate-500 text-base mt-2 max-w-2xl">
              Chaque modèle est pensé selon les codes visuels et les besoins fonctionnels spécifiques de chaque profession.
            </p>
          </div>

          <Link
            href="/#catalogue"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <span>Voir tous les modèles</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Categories cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat.id] || Layers;
            const subs = subCategories.filter(s => s.category_id === cat.id);
            const isSelected = category === cat.id;

            return (
              <div 
                key={cat.id}
                className={`relative rounded-2xl p-6 transition-all border ${
                  isSelected 
                    ? 'bg-blue-50/70 border-blue-500 shadow-md ring-2 ring-blue-500/20' 
                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{cat.name}</h3>
                <p className="text-xs text-slate-500 mb-4 line-clamp-2">{cat.description}</p>
                
                {/* Subcategory tags */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {subs.slice(0, 4).map(sub => (
                    <Link
                      key={sub.id}
                      href={`/?category=${cat.id}&subcategory=${sub.id}#catalogue`}
                      className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                        subcategory === sub.id 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {sub.name}
                    </Link>
                  ))}
                  {subs.length > 4 && (
                    <span className="text-[10px] text-slate-400 self-center">+{subs.length - 4} autres</span>
                  )}
                </div>

                <Link
                  href={`/?category=${cat.id}#catalogue`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  <span>Explorer cette catégorie</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. CATALOGUE DE TEMPLATES (CARTES PRODUITS) */}
      <section id="catalogue" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-slate-200 pb-6">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Catalogue Officiel</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Nos templates prêts à l’emploi
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Sélectionnez votre modèle, visualisez toutes ses pages et démarrez votre personnalisation.
            </p>
          </div>

          {/* Active filter reset pill */}
          {(category || subcategory || q) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filtres actifs</span>
              <Link
                href="/#catalogue"
                className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 hover:bg-rose-100"
              >
                Réinitialiser les filtres ✕
              </Link>
            </div>
          )}
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-md mx-auto">
            <Sliders className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">Aucun template ne correspond à votre recherche</h3>
            <p className="text-sm text-slate-500 mt-1 mb-5">Modifiez vos critères ou parcourez l’ensemble de notre catalogue.</p>
            <Link
              href="/#catalogue"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700"
            >
              Afficher tous les templates
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {templates.map((tpl) => (
              <div 
                key={tpl.id}
                className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300"
              >
                {/* Landing Screenshot Thumbnail */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 border-b border-slate-100">
                  <img
                    src={tpl.thumbnail_url}
                    alt={tpl.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Category Pill Badge */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="text-[11px] font-bold bg-white/95 backdrop-blur-sm text-slate-800 px-2.5 py-1 rounded-full shadow-sm border border-slate-200/80">
                      {tpl.sub_category_name || tpl.category_name}
                    </span>
                    {tpl.type === 'ECOMMERCE' && (
                      <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-1 rounded-full shadow-sm">
                        E-commerce
                      </span>
                    )}
                  </div>

                  {/* Price Tag */}
                  <div className="absolute bottom-3 right-3 bg-slate-900/90 text-white px-3 py-1 rounded-lg text-sm font-extrabold backdrop-blur-sm shadow-md">
                    {tpl.price.toFixed(2)} €
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span>{tpl.category_name}</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Clé en main
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {tpl.name}
                    </h3>

                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {tpl.headline || tpl.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <Link
                      href={`/preview/${tpl.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-semibold text-xs sm:text-sm border border-blue-200/80 hover:border-blue-600 transition-all shadow-sm group/btn"
                      title="Explorer la démo en direct multi-pages"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600 group-hover/btn:text-white transition-colors" />
                      <span>Démo direct</span>
                    </Link>
                    <Link
                      href={`/templates/${tpl.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition-colors shadow-sm"
                    >
                      <span>Fiche & Achat</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. SECTION PROCESSUS / COMMENT ÇA MARCHE */}
      <section id="avantages" className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Processus Simple & Efficace</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              De l’idée à votre site en ligne en 3 étapes
            </h2>
            <p className="text-slate-400 text-base">
              Tout est pensé pour supprimer la complexité technique et accélérer votre visibilité.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 relative space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xl font-black">
                1
              </div>
              <h3 className="text-xl font-bold text-white">Choisissez votre modèle</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Explorez les captures de toutes les pages (accueil, services, boutique, devis) et achetez le template adapté à votre profession en 1 clic.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 relative space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl font-black">
                2
              </div>
              <h3 className="text-xl font-bold text-white">Personnalisez sans coder</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Accédez à votre éditeur visuel 3 panneaux. Modifiez les textes, importez vos photos, réorganisez les sections et ajustez vos couleurs en direct.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 relative space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl font-black">
                3
              </div>
              <h3 className="text-xl font-bold text-white">Publiez en un clic</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Votre site est immédiatement mis en ligne avec un sous-domaine offert et sécurisé SSL, avec possibilité de lier votre propre nom de domaine.
              </p>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
