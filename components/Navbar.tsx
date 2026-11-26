'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Sparkles, 
  ShoppingBag, 
  User, 
  LayoutDashboard, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X,
  Search
} from 'lucide-react';
import { getLocalCart } from '@/lib/cart';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ fullName: string; role: string; email: string } | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch current user and cart items count
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  const updateCart = () => {
    const items = getLocalCart();
    setCartCount(items.length);
  };

  useEffect(() => {
    checkAuth();
    updateCart();

    const handleCartEvent = () => updateCart();
    window.addEventListener('cart-updated', handleCartEvent);
    return () => window.removeEventListener('cart-updated', handleCartEvent);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' })
    });
    setUser(null);
    router.push('/');
    router.refresh();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}#catalogue`);
    }
  };

  // Do not show full marketplace navbar inside the visual editor
  if (pathname.startsWith('/editor/')) return null;

  return (
    <header className="sticky top-0 z-50 glass-nav border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Logo HELPot */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                HELP<span className="text-blue-600 font-extrabold">ot</span>
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-600 -mt-1">
                Marketplace & Studio
              </span>
            </div>
          </Link>

          {/* Quick Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative w-72 lg:w-96">
            <input
              type="text"
              placeholder="Rechercher un métier, un style..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-sm text-slate-800 rounded-full pl-10 pr-4 py-2 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          </form>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-7">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-colors ${pathname === '/' ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Accueil
            </Link>
            <Link 
              href="/#categories" 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Catégories
            </Link>
            <Link 
              href="/#catalogue" 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Templates
            </Link>
            <Link 
              href="/#avantages" 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Comment ça marche
            </Link>
          </nav>

          {/* Right Action Icons (Cart, Auth, Dashboard) */}
          <div className="flex items-center gap-3">
            
            {/* Panier */}
            <Link 
              href="/cart"
              className="relative p-2.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
              title="Mon panier"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center animate-pulse shadow-sm">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Authenticated user menu or Login button */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-blue-600 shadow-sm transition-all"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Mon Espace Client</span>
                </Link>

                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="p-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-700 border border-amber-300 hover:bg-amber-100 transition-colors flex items-center gap-1"
                    title="Back-Office Administrateur"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span className="hidden xl:inline">Admin</span>
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Connexion</span>
                </Link>
                <Link
                  href="/#catalogue"
                  className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm shadow-blue-500/20 hover:shadow-md transition-all"
                >
                  Découvrir les templates
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile drawer menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative mb-3">
            <input
              type="text"
              placeholder="Rechercher un modèle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 text-sm rounded-xl pl-10 pr-4 py-2.5 border border-slate-200 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          </form>

          <Link 
            href="/" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-700 hover:text-blue-600"
          >
            Accueil
          </Link>
          <Link 
            href="/#categories" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-700 hover:text-blue-600"
          >
            Catégories de métiers
          </Link>
          <Link 
            href="/#catalogue" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-700 hover:text-blue-600"
          >
            Tous les templates
          </Link>
          <Link 
            href="/cart" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-slate-700 hover:text-blue-600"
          >
            Mon panier ({cartCount})
          </Link>
          {user ? (
            <Link 
              href="/dashboard" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-blue-600"
            >
              Mon Tableau de bord
            </Link>
          ) : (
            <Link 
              href="/login" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-blue-600"
            >
              Se connecter / Créer un compte
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
