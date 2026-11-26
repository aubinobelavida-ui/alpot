'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Globe, 
  Edit3, 
  ExternalLink, 
  Settings, 
  PlusCircle, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  ShieldCheck,
  Layers,
  ShoppingBag,
  Sliders,
  AlertCircle
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalSites: 0, configuring: 0, published: 0 });

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const authRes = await fetch('/api/auth');
        const authData = await authRes.json();
        if (!authData.authenticated) {
          router.push('/login');
          return;
        }
        setUser(authData.user);

        const sitesRes = await fetch('/api/sites');
        const sitesData = await sitesRes.json();
        setSites(sitesData.sites || []);
        setStats(sitesData.stats || { totalSites: 0, configuring: 0, published: 0 });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-slate-500">Chargement de votre espace client...</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Publié en ligne
          </span>
        );
      case 'READY_TO_PUBLISH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Prêt à publier
          </span>
        );
      case 'CONFIGURING':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            En personnalisation
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* 5.1 Dashboard Welcome & Quick Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.2),transparent)] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-300 text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" /> Espace Personnel Client
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Bonjour, {user?.fullName || 'Entrepreneur'} !
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Bienvenue sur votre tableau de bord. Gérez vos sites web acquis, personnalisez vos pages sans coder et suivez leur publication en temps réel.
            </p>
          </div>

          <Link
            href="/#catalogue"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition-all self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Acquérir un nouveau site</span>
          </Link>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 mt-8 border-t border-slate-700/60 relative z-10">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <span className="text-xs text-slate-400 font-medium">Total sites acquis</span>
            <div className="text-3xl font-black text-white mt-1">{stats.totalSites}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <span className="text-xs text-slate-400 font-medium">En cours de personnalisation</span>
            <div className="text-3xl font-black text-amber-400 mt-1">{stats.configuring}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <span className="text-xs text-slate-400 font-medium">Sites actifs & publiés</span>
            <div className="text-3xl font-black text-emerald-400 mt-1">{stats.published}</div>
          </div>
        </div>
      </div>

      {/* 5.2 Section « Mes sites web » */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mes sites web</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Chaque achat dispose d’une instance totalement étanche et autonome.
            </p>
          </div>

          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
            {sites.length} instance(s) active(s)
          </span>
        </div>

        {sites.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <Globe className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Aucun site dans votre bibliothèque</h3>
            <p className="text-sm text-slate-500">
              Vous n'avez pas encore acheté de template. Choisissez un modèle dans la marketplace pour démarrer.
            </p>
            <Link
              href="/#catalogue"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700"
            >
              Parcourir les templates disponibles
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sites.map((site) => (
              <div
                key={site.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
              >
                {/* Thumbnail & Status Overlay */}
                <div className="relative aspect-16/9 bg-slate-900 overflow-hidden">
                  <img
                    src={site.template_thumbnail || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80'}
                    alt={site.name}
                    className="w-full h-full object-cover object-top opacity-85 hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute top-3 left-3">
                    {getStatusBadge(site.status)}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur-sm text-white text-[11px] px-2 py-0.5 rounded font-mono">
                    {site.subdomain_slug}.helpot.fr
                  </div>
                </div>

                {/* Body info */}
                <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                      {site.template_name}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-1 line-clamp-1">
                      {site.name}
                    </h3>
                    <div className="text-xs text-slate-400 mt-1">
                      Acquis le {new Date(site.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>

                  {/* 3 Main Action Buttons */}
                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <Link
                      href={`/editor/${site.id}`}
                      className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Personnaliser mon site (Éditeur)</span>
                    </Link>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/sites/${site.subdomain_slug}`}
                        target="_blank"
                        className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Prévisualiser</span>
                      </Link>

                      <Link
                        href={`/dashboard/sites/${site.id}`}
                        className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Gérer mon site</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
