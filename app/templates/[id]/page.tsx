'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  ShoppingBag, 
  CheckCircle, 
  Sparkles, 
  Maximize2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Layers, 
  Eye, 
  Zap,
  Globe,
  Palette
} from 'lucide-react';
import { addToLocalCart } from '@/lib/cart';

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Gallery state
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [addedToast, setAddedToast] = useState(false);

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
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-slate-500">Chargement de la fiche template...</p>
      </div>
    );
  }

  if (error || !data?.template) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Template introuvable</h2>
        <p className="text-slate-500 mt-2 mb-6">{error || 'Le template demandé n’existe pas ou a été désactivé.'}</p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm">
          <ArrowLeft className="w-4 h-4" /> Retourner au catalogue
        </Link>
      </div>
    );
  }

  const { template, screenshots, availablePages } = data;
  const currentScreenshot = screenshots[selectedScreenshotIndex] || {
    image_url: template.thumbnail_url,
    page_name: 'Vue Principale'
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
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/cart');
  };

  const nextScreenshot = () => {
    if (screenshots.length > 0) {
      setSelectedScreenshotIndex((prev) => (prev + 1) % screenshots.length);
    }
  };

  const prevScreenshot = () => {
    if (screenshots.length > 0) {
      setSelectedScreenshotIndex((prev) => (prev - 1 + screenshots.length) % screenshots.length);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-12">
      
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/#catalogue"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au catalogue</span>
        </Link>

        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          {template.sub_category_name || template.category_name}
        </span>
      </div>

      {/* Main Grid: Gallery on Left (Col-8), Purchase Info on Right (Col-4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left: Gallery of Up to 10 Screenshots */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Main Selected Screenshot Display */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md group">
            <div className="aspect-[16/10] w-full overflow-hidden bg-slate-950 flex items-center justify-center">
              <img
                src={currentScreenshot.image_url}
                alt={currentScreenshot.page_name}
                className="w-full h-full object-cover object-top transition-all duration-300"
              />
            </div>

            {/* Page Name Tag */}
            <div className="absolute top-4 left-4 bg-slate-900/85 backdrop-blur-md text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-slate-700/50 shadow-sm flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>{currentScreenshot.page_name}</span>
            </div>

            {/* Lightbox zoom trigger */}
            <button
              onClick={() => setIsLightboxOpen(true)}
              className="absolute top-4 right-4 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
              title="Agrandir la capture d'écran"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Previous / Next buttons */}
            {screenshots.length > 1 && (
              <>
                <button
                  onClick={prevScreenshot}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextScreenshot}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-950/70 backdrop-blur-sm rounded-full text-[11px] text-slate-300 font-medium">
              {selectedScreenshotIndex + 1} / {screenshots.length} captures
            </div>
          </div>

          {/* Thumbnails Navigation Row */}
          {screenshots.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {screenshots.map((s: any, idx: number) => (
                <button
                  key={s.id || idx}
                  onClick={() => setSelectedScreenshotIndex(idx)}
                  className={`relative flex-shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    selectedScreenshotIndex === idx 
                      ? 'border-blue-600 ring-2 ring-blue-500/20 scale-[1.02]' 
                      : 'border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={s.image_url} alt={s.page_name} className="w-full h-full object-cover object-top" />
                  <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[9px] text-white py-0.5 truncate px-1 text-center font-medium">
                    {s.page_name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Available Pages list */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 space-y-4">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <span>Pages & structures intégrées dans ce template</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availablePages && availablePages.length > 0 ? (
                availablePages.map((p: any) => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>{p.title}</span>
                  </div>
                ))
              ) : (
                ['Accueil / Landing', 'Boutique & Catalogue', 'Fiche Produit', 'Panier d’achat', 'À Propos', 'Contact & Devis'].map((t) => (
                  <div key={t} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>{t}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right: Purchase and Key Features Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-28 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
            
            {/* Template Header */}
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
                {template.category_name}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {template.name}
              </h1>
              <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                {template.description}
              </p>
            </div>

            {/* Price section */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold">Paiement unique</span>
                <div className="text-3xl font-black text-slate-900">
                  {template.price.toFixed(2)} €
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100/70 px-2.5 py-1 rounded-full border border-emerald-200">
                Licence à vie
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleBuyNow}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-md shadow-blue-500/25 hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5 text-amber-300" />
                <span>Acheter & Créer mon site</span>
              </button>

              <button
                onClick={handleAddToCart}
                className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-slate-600" />
                <span>Ajouter au panier</span>
              </button>

              {addedToast && (
                <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg text-center border border-emerald-200 animate-fadeIn">
                  ✓ Template ajouté au panier avec succès !
                </div>
              )}
            </div>

            {/* Features Checklist */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Fonctionnalités incluses :
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-700">
                {template.features && template.features.length > 0 ? (
                  template.features.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))
                ) : (
                  <>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>Éditeur visuel No-Code complet</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>Sous-domaine temporaire et hébergement inclus</span>
                    </li>
                  </>
                )}
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Instance indépendante et étanche (Multi-Tenant)</span>
                </li>
              </ul>
            </div>

            {/* Reassurance badge */}
            <div className="pt-2 flex items-center gap-3 text-xs text-slate-400">
              <ShieldCheck className="w-5 h-5 text-slate-500" />
              <span>Garantie de satisfaction et support technique inclus</span>
            </div>

          </div>
        </div>

      </div>

      {/* Lightbox Modal for Fullscreen Image Zoom */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-6xl flex items-center justify-between text-white mb-3">
            <span className="text-sm font-semibold">{currentScreenshot.page_name}</span>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative max-w-6xl max-h-[85vh] overflow-auto rounded-xl">
            <img
              src={currentScreenshot.image_url}
              alt={currentScreenshot.page_name}
              className="max-h-[85vh] w-auto object-contain rounded-xl shadow-2xl"
            />
          </div>

          {screenshots.length > 1 && (
            <div className="flex gap-4 mt-4">
              <button
                onClick={prevScreenshot}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Précédente
              </button>
              <button
                onClick={nextScreenshot}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm flex items-center gap-1"
              >
                Suivante <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
