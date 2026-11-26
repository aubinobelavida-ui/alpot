'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldAlert, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Globe, 
  Layers, 
  DollarSign, 
  Plus, 
  CheckCircle, 
  Search,
  ExternalLink,
  Sliders,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function AdminBackOfficePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'metrics' | 'templates' | 'orders' | 'clients'>('metrics');

  // New Template modal
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [newTplName, setNewTplName] = useState('');
  const [newTplPrice, setNewTplPrice] = useState('199');
  const [newTplCat, setNewTplCat] = useState('metiers-artisanat');
  const [newTplThumb, setNewTplThumb] = useState('https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80');
  const [newTplHeadline, setNewTplHeadline] = useState('');
  const [newTplDesc, setNewTplDesc] = useState('');

  useEffect(() => {
    async function loadAdminData() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin');
        const json = await res.json();
        if (!res.ok) {
          router.push('/login');
          return;
        }
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, [router]);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTplName,
          headline: newTplHeadline,
          description: newTplDesc,
          price: parseFloat(newTplPrice) || 199,
          category_id: newTplCat,
          thumbnail_url: newTplThumb,
          features: ['Personnalisation sans code', 'Multi-tenant garanti', 'Pages intégrées', 'SEO local optimisé']
        })
      });

      if (res.ok) {
        setShowAddTemplate(false);
        // Refresh admin data
        const r = await fetch('/api/admin');
        const refreshed = await r.json();
        setData(refreshed);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-amber-600 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-slate-500">Chargement du Back-Office HELPot...</p>
      </div>
    );
  }

  const { metrics, recentOrders, clients, templates } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" /> Back-Office Administrateur HELPot
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Supervision & Gestion</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez le catalogue officiel de templates, suivez les ventes et supervisez les comptes clients.
          </p>
        </div>

        <button
          onClick={() => setShowAddTemplate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un template au catalogue</span>
        </button>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Revenus Cumulés</span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {(metrics.totalRevenue || 0).toFixed(2)} €
          </div>
          <div className="text-xs text-emerald-600 font-bold">
            {metrics.totalOrders} commandes confirmées
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Clients Inscrits</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{metrics.totalClients}</div>
          <div className="text-xs text-slate-500">Comptes acheteurs actifs</div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Sites Déployés</span>
            <Globe className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{metrics.totalSites}</div>
          <div className="text-xs text-slate-500">
            dont {metrics.publishedSites} publiés en ligne
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Catalogue Templates</span>
            <Layers className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{metrics.totalTemplates}</div>
          <div className="text-xs text-slate-500">Prêts à être vendus</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'metrics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Dernières Ventes & Commandes
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'templates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Gestion du Catalogue ({templates.length})
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'clients' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Comptes Clients ({clients.length})
        </button>
      </div>

      {/* TAB 1: Orders */}
      {activeTab === 'metrics' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Transactions récentes (Stripe)</h3>
            <span className="text-xs text-slate-400">{recentOrders.length} commande(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Commande</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Montant</th>
                  <th className="py-3 px-4">Passerelle</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {recentOrders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{o.id}</td>
                    <td className="py-3 px-4">
                      <div>{o.user_name || 'Utilisateur'}</div>
                      <div className="text-[11px] text-slate-400">{o.user_email}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{o.total_amount?.toFixed(2)} €</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{o.payment_gateway}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{new Date(o.created_at).toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Templates Management */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl: any) => (
            <div key={tpl.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-5 space-y-4">
              <div className="aspect-16/9 rounded-xl overflow-hidden bg-slate-100">
                <img src={tpl.thumbnail_url} alt={tpl.name} className="w-full h-full object-cover object-top" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase">{tpl.category_name}</span>
                <h4 className="text-base font-bold text-slate-900 mt-0.5">{tpl.name}</h4>
                <div className="text-xs text-slate-500 font-bold mt-1">{tpl.price} € — {tpl.sales_count || 0} vente(s)</div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link href={`/templates/${tpl.id}`} target="_blank" className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                  <span>Voir la fiche</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">Actif</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Clients */}
      {activeTab === 'clients' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Nom / Entreprise</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Sites Détenus</th>
                <th className="py-3 px-4">Inscrit le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {clients.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-bold text-slate-900">{c.full_name}</td>
                  <td className="py-3 px-4 text-slate-500 font-mono">{c.email}</td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      {c.sites_count} site(s)
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add Template */}
      {showAddTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateTemplate} className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Ajouter un nouveau template au catalogue</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom du template</label>
              <input
                type="text"
                required
                value={newTplName}
                onChange={(e) => setNewTplName(e.target.value)}
                placeholder="Ex: Élite Électricien — Dépannage & Installations"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prix (€)</label>
                <input
                  type="number"
                  required
                  value={newTplPrice}
                  onChange={(e) => setNewTplPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie</label>
                <select
                  value={newTplCat}
                  onChange={(e) => setNewTplCat(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                >
                  <option value="metiers-artisanat">Métiers et artisanat</option>
                  <option value="services-pro">Services professionnels</option>
                  <option value="beaute-bien-etre">Beauté et bien-être</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="autres-secteurs">Autres secteurs</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Image de couverture / Capture principale (URL)</label>
              <input
                type="text"
                required
                value={newTplThumb}
                onChange={(e) => setNewTplThumb(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Accroche commerciale (Headline)</label>
              <input
                type="text"
                value={newTplHeadline}
                onChange={(e) => setNewTplHeadline(e.target.value)}
                placeholder="Une phrase courte percutante pour la carte produit..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description complète</label>
              <textarea
                rows={3}
                value={newTplDesc}
                onChange={(e) => setNewTplDesc(e.target.value)}
                placeholder="Description détaillée du modèle, de sa cible et de ses fonctionnalités..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3 justify-end pt-3">
              <button
                type="button"
                onClick={() => setShowAddTemplate(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Créer le template
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
