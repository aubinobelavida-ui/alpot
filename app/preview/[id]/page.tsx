'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Monitor, 
  Tablet, 
  Smartphone, 
  ShoppingBag, 
  Check, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  Layers,
  Eye,
  CreditCard
} from 'lucide-react';
import SectionRenderer from '@/components/editor/SectionRenderer';
import { addToLocalCart } from '@/lib/cart';

function PreviewContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const templateId = params.id as string;
  const initialPage = searchParams.get('p') || '';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Active page slug in preview ('' = Home/Landing)
  const [activePageSlug, setActivePageSlug] = useState<string>(initialPage);

  // Responsive device simulation
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Feedback toast for adding to cart
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadTemplate() {
      try {
        setLoading(true);
        const res = await fetch(`/api/templates/${templateId}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'Erreur lors du chargement');
        } else {
          setData(json);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadTemplate();
  }, [templateId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-400">Chargement de l’univers en direct...</p>
      </div>
    );
  }

  if (error || !data?.template) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <h2 className="text-2xl font-black mb-2">Modèle introuvable</h2>
        <p className="text-slate-400 text-sm max-w-md mb-6">{error || 'Le modèle demandé n’est pas disponible en prévisualisation.'}</p>
        <Link 
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Retourner au catalogue
        </Link>
      </div>
    );
  }

  const { template, availablePages = [], demoProducts = [], demoServices = [] } = data;

  // Find active page object
  const activePage = availablePages.find((p: any) => p.slug === activePageSlug) || availablePages[0] || {
    title: 'Accueil',
    sections: []
  };

  const handleAddToCart = () => {
    addToLocalCart({
      templateId: template.id,
      name: template.name,
      price: template.price,
      thumbnailUrl: template.thumbnail_url,
      categoryName: template.category_name,
      slug: template.slug
    });
    setToastMessage(`« ${template.name} » a été ajouté à votre panier !`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/cart');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 font-sans">
      
      {/* 1. TOP PERSISTENT PREVIEW CONTROL BAR */}
      <header className="sticky top-0 z-50 h-16 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white px-4 sm:px-6 flex items-center justify-between shadow-xl">
        
        {/* Left: Exit & Template Identity */}
        <div className="flex items-center gap-3">
          <Link
            href={`/templates/${template.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            title="Revenir à la fiche produit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Quitter la démo</span>
          </Link>

          <div className="h-5 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-white tracking-tight">
              {template.name}
            </span>
            <span className="hidden md:inline text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
              {template.sub_category_name || template.category_name}
            </span>
          </div>
        </div>

        {/* Center: Pages Navigator & Viewport Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Annex Pages Selector Tabs */}
          <div className="hidden lg:flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
            {availablePages.map((page: any) => {
              const isActive = (page.slug === activePageSlug) || (page.is_home && activePageSlug === '');
              return (
                <button
                  key={page.id || page.slug}
                  onClick={() => setActivePageSlug(page.slug)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    isActive 
                      ? 'bg-blue-600 text-white font-bold shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {page.title}
                </button>
              );
            })}
          </div>

          {/* Viewport responsive toggles */}
          <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-slate-400">
            <button
              onClick={() => setViewportMode('desktop')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewportMode === 'desktop' ? 'bg-blue-600 text-white shadow-sm' : 'hover:text-white'
              }`}
              title="Aperçu Ordinateur (Plein écran)"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewportMode('tablet')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewportMode === 'tablet' ? 'bg-blue-600 text-white shadow-sm' : 'hover:text-white'
              }`}
              title="Aperçu Tablette (768px)"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewportMode('mobile')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewportMode === 'mobile' ? 'bg-blue-600 text-white shadow-sm' : 'hover:text-white'
              }`}
              title="Aperçu Smartphone (375px)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Right: Price & Purchase CTAs */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block text-right">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Tarif licence</div>
            <div className="text-base font-black text-white">{template.price.toFixed(2)} €</div>
          </div>

          <button
            onClick={handleAddToCart}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors border border-slate-700 flex items-center gap-1.5 shadow-sm"
            title="Ajouter au panier"
          >
            <ShoppingBag className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Panier</span>
          </button>

          <button
            onClick={handleBuyNow}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5"
          >
            <span>Acheter ce modèle</span>
          </button>
        </div>

      </header>

      {/* Mobile Page Navigator Dropdown (below header on small screens) */}
      <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-semibold">Page affichée :</span>
        <select
          value={activePageSlug}
          onChange={(e) => setActivePageSlug(e.target.value)}
          className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium outline-none"
        >
          {availablePages.map((page: any) => (
            <option key={page.id || page.slug} value={page.slug}>
              {page.title}
            </option>
          ))}
        </select>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. LIVE INTERACTIVE CANVAS BODY */}
      <main className="flex-1 bg-slate-950 overflow-y-auto p-2 sm:p-6 flex justify-center items-start">
        <div 
          className={`bg-white transition-all duration-300 shadow-2xl overflow-hidden min-h-screen ${
            viewportMode === 'mobile' 
              ? 'w-[375px] my-6 ring-8 ring-slate-800 rounded-[36px] shadow-slate-900/80' 
              : viewportMode === 'tablet' 
              ? 'w-[768px] my-6 ring-8 ring-slate-800 rounded-[28px] shadow-slate-900/80' 
              : 'w-full max-w-7xl rounded-2xl'
          }`}
        >
          {/* Render All Sections for Active Page */}
          <div className="min-h-screen flex flex-col justify-between">
            <div>
              {(activePage.sections || []).map((section: any, idx: number) => (
                <SectionRenderer
                  key={section.id || idx}
                  section={section}
                  siteTheme={{
                    primaryColor: template.type === 'ECOMMERCE' ? '#2563eb' : '#b45309'
                  }}
                  siteData={{
                    products: demoProducts,
                    services: demoServices
                  }}
                  isEditor={false}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Sticky Info Pill */}
      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md text-slate-300 border border-slate-700/80 rounded-full px-5 py-2 text-xs flex items-center gap-3 shadow-2xl">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Mode Prévisualisation Interactive — Toutes les pages et sections sont incluses à l’achat</span>
        <div className="h-3 w-px bg-slate-700" />
        <button
          onClick={handleBuyNow}
          className="text-blue-400 hover:text-blue-300 font-bold underline"
        >
          Personnaliser ce template dès {template.price.toFixed(2)} €
        </button>
      </footer>

    </div>
  );
}

export default function TemplateLivePreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PreviewContent />
    </Suspense>
  );
}
