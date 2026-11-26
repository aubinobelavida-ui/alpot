'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  Star, 
  Phone, 
  Mail, 
  MapPin, 
  ShoppingBag, 
  Send,
  Award,
  Compass,
  ShieldCheck,
  Utensils,
  BookOpen,
  Layers
} from 'lucide-react';

interface SectionRendererProps {
  section: {
    id: string;
    type: string;
    name: string;
    is_hidden?: boolean;
    settings: any;
    styles?: any;
  };
  isSelected?: boolean;
  onSelect?: () => void;
  siteTheme?: any;
  siteData?: { products?: any[]; services?: any[] };
  isEditor?: boolean;
}

export default function SectionRenderer({
  section,
  isSelected,
  onSelect,
  siteTheme,
  siteData,
  isEditor = false,
}: SectionRendererProps) {
  if (section.is_hidden && !isEditor) return null;

  const { settings = {}, styles = {} } = section;
  const primaryColor = siteTheme?.primaryColor || '#2563eb';

  // Wrapper for selection outline in editor
  const wrapperClass = isEditor 
    ? `relative transition-all cursor-pointer group ${
        isSelected 
          ? 'ring-4 ring-blue-500 ring-offset-2 z-10' 
          : 'hover:ring-2 hover:ring-blue-300 hover:ring-offset-1'
      } ${section.is_hidden ? 'opacity-40' : ''}`
    : 'relative';

  return (
    <div 
      onClick={isEditor ? onSelect : undefined}
      className={wrapperClass}
    >
      {/* Editor Badge overlay on hover/select */}
      {isEditor && (
        <div className={`absolute top-2 left-2 z-20 px-2.5 py-1 rounded-md text-[11px] font-bold shadow-md transition-opacity ${
          isSelected 
            ? 'bg-blue-600 text-white' 
            : 'bg-slate-900/80 text-slate-200 opacity-0 group-hover:opacity-100'
        }`}>
          {section.name || section.type}
          {section.is_hidden && ' (Masqué)'}
        </div>
      )}

      {/* RENDER BY SECTION TYPE */}
      {section.type === 'header' && (
        <header className="border-b border-slate-200 bg-white" style={{ backgroundColor: styles.bgColor || '#ffffff' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {settings.brandName?.charAt(0) || 'H'}
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {settings.brandName || 'Mon Entreprise'}
              </span>
            </div>

            <nav className="hidden md:flex items-center space-x-6 text-sm font-semibold text-slate-700">
              {(settings.navLinks || []).map((link: any, idx: number) => (
                <span key={idx} className="hover:text-blue-600 cursor-pointer">
                  {link.label}
                </span>
              ))}
            </nav>

            <button
              className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {settings.ctaButtonText || 'Prendre contact'}
            </button>
          </div>
        </header>
      )}

      {section.type === 'hero' && (
        <div 
          className="relative text-white flex items-center justify-center overflow-hidden"
          style={{
            minHeight: '520px',
            backgroundColor: '#0f172a',
            paddingTop: styles.paddingTop || '90px',
            paddingBottom: styles.paddingBottom || '90px'
          }}
        >
          {settings.bgImageUrl && (
            <div className="absolute inset-0 z-0">
              <img
                src={settings.bgImageUrl}
                alt="Hero Background"
                className="w-full h-full object-cover"
              />
              <div 
                className="absolute inset-0 bg-slate-950" 
                style={{ opacity: (settings.overlayOpacity ?? 50) / 100 }} 
              />
            </div>
          )}

          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              {settings.title || 'Votre titre principal percutant'}
            </h1>
            <p className="text-lg sm:text-xl text-slate-200 max-w-2xl mx-auto font-normal leading-relaxed">
              {settings.subtitle || 'Présentez vos services et votre savoir-faire d’excellence.'}
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              {settings.ctaPrimaryText && (
                <button
                  className="px-7 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition-transform hover:scale-105"
                  style={{ backgroundColor: primaryColor }}
                >
                  {settings.ctaPrimaryText}
                </button>
              )}
              {settings.ctaSecondaryText && (
                <button className="px-6 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20">
                  {settings.ctaSecondaryText}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {section.type === 'features' && (
        <div 
          className="py-16 sm:py-24"
          style={{ backgroundColor: styles.bgColor || '#f8fafc' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
            <div>
              {settings.tagline && (
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
                  {settings.tagline}
                </span>
              )}
              <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
                {settings.heading || 'Nos Engagements & Valeurs'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {(settings.items || []).map((item: any, idx: number) => (
                <div key={idx} className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm text-left space-y-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Award className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {section.type === 'showcase_grid' && (
        <div className="py-16 sm:py-24 bg-white" style={{ backgroundColor: styles.bgColor || '#ffffff' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              {settings.tagline && (
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
                  {settings.tagline}
                </span>
              )}
              <h2 className="text-3xl font-extrabold text-slate-900">
                {settings.heading || 'Galerie de Réalisations'}
              </h2>
              <p className="text-sm text-slate-500">{settings.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(settings.items || []).map((item: any, idx: number) => (
                <div key={idx} className="group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
                  <div className="aspect-[16/10] overflow-hidden bg-slate-200">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <span className="text-[10px] font-bold text-blue-600 uppercase">{item.category}</span>
                    <h4 className="text-base font-bold text-slate-900 mt-0.5">{item.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {section.type === 'testimonials' && (
        <div className="py-16 sm:py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
                {settings.tagline || 'Avis Clients'}
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900">
                {settings.heading || 'Ce que nos clients disent de nous'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(settings.items || []).map((t: any, idx: number) => (
                <div key={idx} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-700 italic leading-relaxed">
                    « {t.content} »
                  </p>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{t.author}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {section.type === 'cta_banner' && (
        <div 
          className="py-16 text-white text-center"
          style={{ backgroundColor: styles.bgColor || '#1e293b' }}
        >
          <div className="max-w-3xl mx-auto px-4 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold">{settings.title}</h2>
            <p className="text-slate-300 text-base">{settings.subtitle}</p>
            <button
              className="px-8 py-3.5 rounded-xl font-bold text-white text-sm shadow-lg transition-transform hover:scale-105"
              style={{ backgroundColor: primaryColor }}
            >
              {settings.buttonText || 'Demander un devis'}
            </button>
          </div>
        </div>
      )}

      {section.type === 'services_list' && (
        <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold text-slate-900">Prestations & Savoir-Faire</h2>
            <p className="text-sm text-slate-500 mt-2">Retrouvez notre gamme d'interventions sur-mesure.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(siteData?.services || []).map((srv: any) => (
              <div key={srv.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{srv.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{srv.description}</p>
                <div className="pt-2 flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>Dès {srv.price_starting_at} €</span>
                  <span className="text-slate-400">{srv.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {section.type === 'contact_form' && (
        <div className="py-16 max-w-2xl mx-auto px-4 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Demande de devis & Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Votre Nom</label>
                <input type="text" placeholder="Alexandre Laurent" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse Email</label>
                <input type="email" placeholder="alex@exemple.fr" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Votre Téléphone</label>
              <input type="tel" placeholder="06 12 34 56 78" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Détails de votre projet</label>
              <textarea rows={3} placeholder="Dimensions, matériaux souhaités, délais envisagés..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none" />
            </div>
            <button
              className="w-full py-3 rounded-xl text-white font-bold text-xs shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              {settings.submitButtonText || 'Transmettre ma demande'}
            </button>
          </div>
        </div>
      )}

      {section.type === 'footer' && (
        <footer 
          className="py-12 border-t border-slate-800 text-slate-400 text-xs"
          style={{ backgroundColor: styles.bgColor || '#0f172a' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <p>{settings.copyright || '© Tous droits réservés.'}</p>
            <div className="flex justify-center gap-6 text-[11px]">
              <span>Mentions Légales</span>
              <span>Politique de Confidentialité</span>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}
