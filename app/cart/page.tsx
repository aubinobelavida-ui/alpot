'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  Trash2, 
  ArrowRight, 
  Tag, 
  ShieldCheck, 
  ArrowLeft,
  Sparkles,
  Check
} from 'lucide-react';
import { getLocalCart, removeFromLocalCart, calculateCartTotal, CartItem } from '@/lib/cart';

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [promoError, setPromoError] = useState('');

  useEffect(() => {
    setItems(getLocalCart());
  }, []);

  const handleRemove = (templateId: string) => {
    const updated = removeFromLocalCart(templateId);
    setItems(updated);
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    const code = promoCode.trim().toUpperCase();
    if (code === 'WELCOME10' || code === 'HELPOT20') {
      setAppliedPromo(code);
    } else {
      setPromoError('Code promotionnel invalide ou expiré');
    }
  };

  const { subtotal, discount, total } = calculateCartTotal(items, appliedPromo);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Votre panier est vide</h1>
        <p className="text-slate-500 mt-2 mb-8 max-w-md mx-auto">
          Explorez notre catalogue de templates professionnels et trouvez le site adapté à votre activité.
        </p>
        <Link
          href="/#catalogue"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all"
        >
          <span>Découvrir les templates</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Page Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Mon Panier</h1>
          <p className="text-sm text-slate-500 mt-1">{items.length} template(s) prêt(s) à être configuré(s)</p>
        </div>
        <Link
          href="/#catalogue"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Continuer mes achats</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => (
            <div 
              key={item.templateId}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <img
                  src={item.thumbnailUrl}
                  alt={item.name}
                  className="w-20 h-16 rounded-xl object-cover object-top border border-slate-100 flex-shrink-0"
                />
                <div>
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">
                    {item.categoryName || 'Template Web'}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">{item.name}</h3>
                  <div className="text-xs text-slate-400 mt-0.5">Instance No-Code & Éditeur inclus</div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6">
                <span className="text-lg font-black text-slate-900">{item.price.toFixed(2)} €</span>
                <button
                  onClick={() => handleRemove(item.templateId)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer du panier"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Reassurance Banner */}
          <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/80 flex items-center gap-3 text-xs text-blue-900">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span>
              <strong>Provisionnement instantané :</strong> dès la validation du paiement, votre site web est automatiquement généré dans votre espace personnel.
            </span>
          </div>
        </div>

        {/* Summary Card & Promo Code */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Récapitulatif de la commande</h3>

            {/* Promo Code Form */}
            <form onSubmit={handleApplyPromo} className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Code promotionnel</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: WELCOME10"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 uppercase outline-none focus:border-blue-500 font-medium"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                >
                  Appliquer
                </button>
              </div>
              {appliedPromo && (
                <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Code {appliedPromo} appliqué (-{appliedPromo === 'WELCOME10' ? '10%' : '20%'})
                </div>
              )}
              {promoError && (
                <div className="text-xs text-rose-600 font-medium">{promoError}</div>
              )}
              <div className="text-[11px] text-slate-400 italic">Astuce : testez le code "WELCOME10"</div>
            </form>

            {/* Price Calculations */}
            <div className="space-y-2.5 pt-4 border-t border-slate-100 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Sous-total</span>
                <span>{subtotal.toFixed(2)} €</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Remise ({appliedPromo})</span>
                  <span>- {discount.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Hébergement & Éditeur</span>
                <span className="text-emerald-600 font-bold">Inclus</span>
              </div>
              <div className="flex justify-between items-baseline pt-4 border-t border-slate-100 text-lg font-black text-slate-900">
                <span>Total à régler</span>
                <span className="text-2xl text-blue-600">{total.toFixed(2)} €</span>
              </div>
            </div>

            {/* Checkout CTA */}
            <button
              onClick={() => router.push(`/checkout${appliedPromo ? `?promo=${appliedPromo}` : ''}`)}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Procéder au paiement sécurisé</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Transaction 100% sécurisée & cryptée</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
