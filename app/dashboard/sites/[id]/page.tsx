'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit3, 
  Globe, 
  Settings, 
  Layers, 
  Palette, 
  Building2, 
  Share2, 
  CheckCircle, 
  ShoppingBag, 
  Mail, 
  Plus, 
  Save, 
  ExternalLink,
  ShieldCheck,
  Trash2
} from 'lucide-react';

export default function SiteManagementPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;

  const [activeTab, setActiveTab] = useState<'pages' | 'general' | 'data' | 'leads'>('pages');
  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Editable fields
  const [siteName, setSiteName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#0f172a');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // New item modal state
  const [showAddData, setShowAddData] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  useEffect(() => {
    async function loadSite() {
      try {
        setLoading(true);
        const res = await fetch(`/api/sites/${siteId}`);
        const data = await res.json();
        if (!res.ok) {
          router.push('/dashboard');
          return;
        }

        setSite(data.site);
        setPages(data.pages || []);

        setSiteName(data.site.name || '');
        setSubdomain(data.site.subdomain_slug || '');
        setCustomDomain(data.site.custom_domain || '');
        setPrimaryColor(data.site.globalTheme?.primaryColor || '#2563eb');
        setSecondaryColor(data.site.globalTheme?.secondaryColor || '#0f172a');
        setSeoTitle(data.site.seoMeta?.title || '');
        setSeoDesc(data.site.seoMeta?.description || '');
        setCompanyPhone(data.site.companyInfo?.phone || '');
        setCompanyAddress(data.site.companyInfo?.address || '');

        // Fetch data (products, services, leads)
        const dataRes = await fetch(`/api/sites/${siteId}/data`);
        const dataJson = await dataRes.json();
        setProducts(dataJson.products || []);
        setServices(dataJson.services || []);
        setSubmissions(dataJson.submissions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSite();
  }, [siteId, router]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: siteName,
          subdomain_slug: subdomain,
          custom_domain: customDomain,
          globalTheme: { primaryColor, secondaryColor, font: 'Inter', radius: '8px' },
          seoMeta: { title: seoTitle, description: seoDesc },
          companyInfo: { phone: companyPhone, address: companyAddress }
        })
      });

      const json = await res.json();
      if (!res.ok) {
        setSaveError(json.error || 'Erreur lors de l’enregistrement');
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      setSaveError(err.message);
    }
  };

  const handleAddDataItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEcommerce = site.type === 'ECOMMERCE' || site.type === 'HYBRID';
    const entityType = isEcommerce ? 'product' : 'service';

    const res = await fetch(`/api/sites/${siteId}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType,
        data: {
          title: newItemTitle,
          description: newItemDesc,
          price: parseFloat(newItemPrice) || 0,
          price_starting_at: parseFloat(newItemPrice) || 0
        }
      })
    });

    if (res.ok) {
      setShowAddData(false);
      setNewItemTitle('');
      setNewItemPrice('');
      setNewItemDesc('');
      // Reload data
      const dataRes = await fetch(`/api/sites/${siteId}/data`);
      const dataJson = await dataRes.json();
      setProducts(dataJson.products || []);
      setServices(dataJson.services || []);
    }
  };

  if (loading || !site) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-slate-500">Chargement des paramètres du site...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Retour à mes sites
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{site.name}</h1>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              site.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {site.status === 'PUBLISHED' ? 'En ligne' : 'En personnalisation'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Adresse : {site.subdomain_slug}.helpot.fr
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href={`/editor/${site.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all"
          >
            <Edit3 className="w-4 h-4" />
            <span>Ouvrir l'Éditeur Visuel</span>
          </Link>
          <Link
            href={`/sites/${site.subdomain_slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Aperçu Public</span>
          </Link>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('pages')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'pages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Structure & Pages ({pages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Paramètres généraux & SEO</span>
        </button>

        <button
          onClick={() => setActiveTab('data')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'data' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{site.type === 'ECOMMERCE' ? 'Catalogue Produits' : 'Catalogue Services'}</span>
        </button>

        <button
          onClick={() => setActiveTab('leads')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'leads' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Demandes reçues ({submissions.length})</span>
        </button>
      </div>

      {/* TAB 1: Pages & Structure */}
      {activeTab === 'pages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Toutes les pages disponibles dans votre site. Cliquez sur « Personnaliser » pour ouvrir l'éditeur visuel sur la page choisie.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                      {p.is_home ? 'Page d’accueil' : 'Page secondaire'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{p.title}</h3>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">/{p.slug}</div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Active" />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Prête à être modifiée</span>
                  <Link
                    href={`/editor/${site.id}?pageId=${p.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-bold text-xs transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Éditer la page</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: General Settings & SEO */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 max-w-3xl">
          <h2 className="text-lg font-bold text-slate-900">Identité visuelle & Domaine</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom du site</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sous-domaine offert (*.helpot.fr)</label>
              <div className="flex">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-l-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 font-mono"
                />
                <span className="bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl px-3 py-2.5 text-xs text-slate-500 font-mono flex items-center">
                  .helpot.fr
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Couleur primaire de la marque</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Couleur secondaire</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <h2 className="text-lg font-bold text-slate-900 pt-4 border-t border-slate-100">Coordonnées de l'entreprise</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone de contact</label>
              <input
                type="text"
                placeholder="06 00 00 00 00"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse physique / Siège</label>
              <input
                type="text"
                placeholder="10 Rue de la République, 75001 Paris"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <h2 className="text-lg font-bold text-slate-900 pt-4 border-t border-slate-100">Optimisation Référencement (SEO)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Balise Titre Google (Meta Title)</label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Nom entreprise — Votre activité principale"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Meta Description</label>
              <textarea
                rows={3}
                value={seoDesc}
                onChange={(e) => setSeoDesc(e.target.value)}
                placeholder="Description concise pour les moteurs de recherche (max 160 caractères)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200">
              ✓ Vos paramètres ont été enregistrés avec succès.
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200">
              ✕ {saveError}
            </div>
          )}

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer les paramètres</span>
          </button>
        </form>
      )}

      {/* TAB 3: Business Data Catalog */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {site.type === 'ECOMMERCE' ? 'Produits en vente' : 'Services & Prestations'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ces éléments sont automatiquement synchronisés avec les widgets de votre site.
              </p>
            </div>
            <button
              onClick={() => setShowAddData(!showAddData)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un élément</span>
            </button>
          </div>

          {/* Add Item form */}
          {showAddData && (
            <form onSubmit={handleAddDataItem} className="bg-white p-6 rounded-2xl border border-blue-200 shadow-md space-y-4 max-w-lg">
              <h4 className="text-sm font-bold text-slate-900">Nouvel élément de catalogue</h4>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Titre / Intitulé</label>
                <input
                  type="text"
                  required
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="Ex: Table basse Chêne massif"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prix (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="Ex: 120"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Détails du produit ou de la prestation..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddData(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          )}

          {/* Items List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(site.type === 'ECOMMERCE' ? products : services).map((item: any) => (
              <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                  <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                    {item.price || item.price_starting_at || 0} €
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                {item.duration && (
                  <div className="text-[11px] text-slate-400">Durée : {item.duration}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Contact Submissions / Leads */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Demandes de contact reçues</h2>
          {submissions.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-sm text-slate-500">
              Aucun message reçu pour le moment. Vos demandes de devis et formulaires de contact apparaîtront ici.
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub: any) => (
                <div key={sub.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{sub.name || 'Visiteur'} ({sub.email})</span>
                    <span className="text-slate-400">{new Date(sub.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                  {sub.phone && <div className="text-xs text-slate-500">Tél : {sub.phone}</div>}
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700">{sub.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
