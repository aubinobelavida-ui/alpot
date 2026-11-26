'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ShieldCheck, 
  CreditCard, 
  Lock, 
  ArrowLeft, 
  CheckCircle, 
  Sparkles, 
  Building2,
  AlertCircle
} from 'lucide-react';
import { getLocalCart, clearLocalCart, calculateCartTotal, CartItem } from '@/lib/cart';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const promoParam = searchParams.get('promo') || '';

  const [items, setItems] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // New account fields if not logged in
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Site names customized by client
  const [siteNames, setSiteNames] = useState<Record<string, string>>({});

  // Payment mock card details
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExp, setCardExp] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successOrder, setSuccessOrder] = useState<any>(null);

  useEffect(() => {
    const cartItems = getLocalCart();
    if (cartItems.length === 0) {
      router.push('/cart');
      return;
    }
    setItems(cartItems);

    // Initial site names
    const names: Record<string, string> = {};
    cartItems.forEach(i => {
      names[i.templateId] = i.name.split('—')[0].trim();
    });
    setSiteNames(names);

    // Check user auth
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth');
        const data = await res.json();
        if (data.authenticated) {
          setCurrentUser(data.user);
          setCardName(data.user.fullName);
        }
      } catch {
        // guest
      } finally {
        setLoadingUser(false);
      }
    }
    checkAuth();
  }, [router]);

  const { subtotal, discount, total } = calculateCartTotal(items, promoParam);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // If not logged in, validate registration
    if (!currentUser) {
      if (!fullName.trim() || !email.trim() || !password) {
        setErrorMessage('Veuillez renseigner toutes vos coordonnées pour créer votre compte client');
        return;
      }
      if (password !== passwordConfirm) {
        setErrorMessage('Les deux mots de passe ne correspondent pas');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Le mot de passe doit comporter au moins 6 caractères');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const payload = {
        items,
        promoCode: promoParam,
        siteCustomNames: siteNames,
        userCredentials: currentUser ? null : {
          fullName,
          email,
          password
        }
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Erreur lors du traitement du paiement');
        setIsSubmitting(false);
        return;
      }

      // Success! Clear cart and display congratulations
      clearLocalCart();
      setSuccessOrder(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur réseau');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle className="w-10 h-10" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900">
          Félicitations pour votre acquisition !
        </h1>

        <p className="text-slate-600 max-w-lg mx-auto">
          Votre paiement de <strong>{successOrder.totalAmount?.toFixed(2)} €</strong> a été confirmé. Vos espaces de travail indépendants ont été générés avec succès.
        </p>

        {/* List of created site instances */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 text-left max-w-md mx-auto space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Vos nouveaux sites web :</h3>
          {successOrder.createdSites?.map((s: any) => (
            <div key={s.siteId} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">{s.name}</div>
                <div className="text-xs text-blue-600 font-mono">{s.subdomain}.helpot.fr</div>
              </div>
              <Link
                href={`/editor/${s.siteId}`}
                className="text-xs font-bold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Personnaliser
              </Link>
            </div>
          ))}
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all"
          >
            Accéder à mon Espace Client
          </Link>
          {successOrder.createdSites?.[0] && (
            <Link
              href={`/editor/${successOrder.createdSites[0].siteId}`}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all"
            >
              Ouvrir l’éditeur visuel
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/cart" className="hover:text-blue-600 flex items-center gap-1 font-medium">
          <ArrowLeft className="w-4 h-4" /> Panier
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">Paiement & Création du site</span>
      </div>

      <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Form: Account, Site naming, Payment info */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. Account Section */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                <span>Compte Client HELPot</span>
              </h2>
              {currentUser && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Connecté : {currentUser.email}
                </span>
              )}
            </div>

            {currentUser ? (
              <p className="text-sm text-slate-600">
                Vous êtes connecté en tant que <strong>{currentUser.fullName}</strong> ({currentUser.email}). Le site acheté sera automatiquement rattaché à votre compte.
              </p>
            ) : (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-slate-500">
                  Votre compte client sera créé automatiquement pour vous permettre d’accéder à l'espace de gestion et à l’éditeur de votre site.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nom complet ou Entreprise *</label>
                    <input
                      type="text"
                      required
                      placeholder="Jean Dupont"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse email *</label>
                    <input
                      type="email"
                      required
                      placeholder="jean.dupont@exemple.fr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mot de passe *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Confirmer mot de passe *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="text-xs text-slate-500 pt-1">
                  Déjà un compte ? <Link href="/login" className="text-blue-600 font-semibold underline">Connectez-vous ici</Link> avant de commander.
                </div>
              </div>
            )}
          </div>

          {/* 2. Site Naming Section */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              <span>Nommez votre site web</span>
            </h2>
            <p className="text-xs text-slate-500">
              Définissez le nom commercial de votre site. Vous pourrez toujours le modifier plus tard dans vos paramètres.
            </p>
            {items.map((item) => (
              <div key={item.templateId} className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Nom pour le template : {item.name}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      required
                      value={siteNames[item.templateId] || ''}
                      onChange={(e) => setSiteNames({ ...siteNames, [item.templateId]: e.target.value })}
                      placeholder="Ex: Atelier Dubois Menuiserie"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 3. Payment Card Section */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
              <span>Paiement sécurisé par carte bancaire</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom sur la carte</label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Numéro de carte</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-blue-500 font-mono"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date d'expiration</label>
                  <input
                    type="text"
                    required
                    value={cardExp}
                    onChange={(e) => setCardExp(e.target.value)}
                    placeholder="MM/AA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CVC / Cryptogramme</label>
                  <input
                    type="text"
                    required
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    placeholder="123"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Paiement 3D-Secure simulé et sécurisé. Vos coordonnées bancaires ne sont jamais stockées sur nos serveurs.</span>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

        </div>

        {/* Right Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-28 bg-white rounded-2xl p-6 border border-slate-200 shadow-md space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Total de votre commande</h3>

            <div className="space-y-3">
              {items.map((i) => (
                <div key={i.templateId} className="flex justify-between text-xs text-slate-700">
                  <span className="line-clamp-1">{i.name}</span>
                  <span className="font-bold ml-2">{i.price.toFixed(2)} €</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Sous-total</span>
                <span>{subtotal.toFixed(2)} €</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Remise ({promoParam})</span>
                  <span>- {discount.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-4 border-t border-slate-100 text-lg font-black text-slate-900">
                <span>Total final</span>
                <span className="text-2xl text-blue-600">{total.toFixed(2)} €</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-base shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validation du paiement...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-amber-300" />
                  <span>Valider & Créer mon site ({total.toFixed(2)} €)</span>
                </>
              )}
            </button>

            <div className="text-[11px] text-slate-400 text-center leading-relaxed">
              En confirmant votre commande, vous acceptez les Conditions Générales de Vente de HELPot.
            </div>
          </div>
        </div>

      </form>

    </div>
  );
}

export default function CheckoutPage() {
  return (
    <React.Suspense fallback={
      <div className="max-w-6xl mx-auto px-4 py-24 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
        <p className="mt-3 text-xs font-semibold text-slate-500">Chargement de votre panier...</p>
      </div>
    }>
      <CheckoutContent />
    </React.Suspense>
  );
}
