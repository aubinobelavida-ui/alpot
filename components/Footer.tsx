import React from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck, Zap, Headphones, CheckCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Value proposition badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 border-b border-slate-800">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-base mb-1">Mise en ligne immédiate</h4>
              <p className="text-sm text-slate-400">Votre site préconçu est immédiatement disponible dans votre espace après achat.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-600/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-base mb-1">Architecture Multi-Tenant Sécurisée</h4>
              <p className="text-sm text-slate-400">Vos données, commandes et contenus sont totalement isolés et protégés.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-600/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-base mb-1">Éditeur Visuel Intuitif</h4>
              <p className="text-sm text-slate-400">Personnalisez chaque section en glisser-déposer sans aucune connaissance technique.</p>
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <span className="text-xl font-black text-white tracking-tight">HELPot</span>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              La plateforme tout-en-un de templates professionnels préconçus et d’édition no-code pour entrepreneurs et artisans.
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800">
              <CheckCircle className="w-3.5 h-3.5" /> Système 100% opérationnel
            </span>
          </div>

          <div>
            <h5 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">Catégories Phares</h5>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/#categories" className="hover:text-white transition-colors">Métiers et artisanat</Link></li>
              <li><Link href="/#categories" className="hover:text-white transition-colors">Services professionnels</Link></li>
              <li><Link href="/#categories" className="hover:text-white transition-colors">Beauté et bien-être</Link></li>
              <li><Link href="/#categories" className="hover:text-white transition-colors">E-commerce & Boutiques</Link></li>
              <li><Link href="/#categories" className="hover:text-white transition-colors">Nouveaux secteurs</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">Plateforme</h5>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/#catalogue" className="hover:text-white transition-colors">Tous les templates</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Espace Client</Link></li>
              <li><Link href="/cart" className="hover:text-white transition-colors">Mon Panier</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Connexion / Inscription</Link></li>
              <li><Link href="/admin" className="hover:text-white transition-colors">Portail Administrateur</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-semibold text-sm tracking-wider uppercase mb-4">Engagements</h5>
            <ul className="space-y-2.5 text-sm">
              <li>Paiement sécurisé Stripe</li>
              <li>Sous-domaine temporaire offert</li>
              <li>Export & Publication instantanée</li>
              <li>Support technique en France</li>
              <li>Conforme RGPD & Déontologie</li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} HELPot Technologies. Tous droits réservés.</p>
          <div className="flex gap-6">
            <span>Conditions Générales de Vente</span>
            <span>Mentions Légales</span>
            <span>Sécurité & Confidentialité</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
