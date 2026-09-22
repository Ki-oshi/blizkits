"use client";

import { useCart } from "@/context/CartContext";
import Button from "@/components/ui/Button";
import { X, Trash2, ShoppingBag, Plus, Minus, ArrowRight, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CartDrawer() {
  const { cart, removeFromCart, updateQuantity, subtotal, isCartOpen, setIsCartOpen } = useCart();
  const router = useRouter();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setIsCartOpen(false);
    router.push("/checkout");
  };

  const handleViewFullCart = () => {
    setIsCartOpen(false);
    router.push("/cart");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
        onClick={() => setIsCartOpen(false)}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-pink-500" />
              <h2 className="text-base font-bold text-neutral-900">Your Shopping Cart</h2>
            </div>
            <button 
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <ShoppingBag className="mx-auto h-12 w-12 text-neutral-300" />
                <p className="text-sm font-bold text-neutral-800">Your cart is empty</p>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto">Explore our catalog and add items to get started.</p>
                <div className="pt-2">
                  <Button 
                    onClick={() => { setIsCartOpen(false); router.push("/shop"); }}
                    size="sm"
                    className="bg-pink-500 hover:bg-pink-600 text-white cursor-pointer"
                  >
                    Explore Shop
                  </Button>
                </div>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-20 w-20 object-cover rounded-xl border border-neutral-200 bg-white" />
                  ) : (
                    <div className="h-20 w-20 flex items-center justify-center rounded-xl bg-pink-50 text-pink-500 border border-pink-100">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                  )}

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-neutral-900 line-clamp-1">{item.name}</h3>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs font-black text-neutral-900 mt-1">₱{item.price?.toLocaleString()}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center border border-neutral-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1 text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 text-xs font-bold text-neutral-900">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1 text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs font-bold text-neutral-900 font-mono">₱{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Action */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-neutral-100 bg-neutral-50 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-neutral-900 font-mono">₱{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-600">
                  <span>Shipping Fee</span>
                  <span className="font-bold text-emerald-600">Calculated at Checkout</span>
                </div>
                <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-sm font-black text-neutral-900">
                  <span>Total</span>
                  <span className="font-mono text-pink-600">₱{subtotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={handleCheckout}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  Proceed to Checkout <ArrowRight className="h-4 w-4" />
                </Button>
                <button 
                  onClick={handleViewFullCart}
                  className="w-full py-2 text-xs font-bold text-neutral-700 hover:text-neutral-900 flex items-center justify-center gap-1.5 bg-white border border-neutral-200 rounded-xl transition-colors cursor-pointer"
                >
                  View Full Cart Page <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}