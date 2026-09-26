"use client";

import { useCart } from "@/context/CartContext";
import Button from "@/components/ui/Button";
import {
  X,
  Trash2,
  ShoppingBag,
  Plus,
  Minus,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "nextjs-toploader/app";

export default function CartDrawer() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    subtotal,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

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

      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="flex w-screen max-w-md flex-col bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-pink-500" />

              <h2 className="text-base font-bold text-neutral-900">
                Your Shopping Cart
              </h2>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="cursor-pointer rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {cart.length === 0 ? (
              <div className="space-y-3 py-16 text-center">
                <ShoppingBag className="mx-auto h-12 w-12 text-neutral-300" />

                <p className="text-sm font-bold text-neutral-800">
                  Your cart is empty
                </p>

                <p className="mx-auto max-w-xs text-xs text-neutral-500">
                  Explore our catalog and add items to get started.
                </p>

                <div className="pt-2">
                  <Button
                    onClick={() => {
                      setIsCartOpen(false);
                      router.push("/shop");
                    }}
                    size="sm"
                    className="cursor-pointer bg-pink-500 text-white hover:bg-pink-600"
                  >
                    Explore Shop
                  </Button>
                </div>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-20 w-20 rounded-xl border border-neutral-200 bg-white object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-pink-100 bg-pink-50 text-pink-500">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-sm font-bold text-neutral-900">
                          {item.name}
                        </h3>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="cursor-pointer text-neutral-400 transition-colors hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="mt-1 text-xs font-black text-neutral-900">
                        ₱{item.price?.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="shadow-2xs flex items-center overflow-hidden rounded-lg border border-neutral-300 bg-white">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.quantity - 1
                            )
                          }
                          className="cursor-pointer px-2 py-1 text-neutral-600 transition-colors hover:bg-neutral-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>

                        <span className="px-3 text-xs font-bold text-neutral-900">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.quantity + 1
                            )
                          }
                          className="cursor-pointer px-2 py-1 text-neutral-600 transition-colors hover:bg-neutral-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <p className="font-mono text-xs font-bold text-neutral-900">
                        ₱
                        {(
                          item.price * item.quantity
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Action */}
          {cart.length > 0 && (
            <div className="space-y-4 border-t border-neutral-100 bg-neutral-50 p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-600">
                  <span>Subtotal</span>

                  <span className="font-mono font-bold text-neutral-900">
                    ₱{subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-600">
                  <span>Shipping Fee</span>

                  <span className="font-bold text-emerald-600">
                    Calculated at Checkout
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-200 pt-2 text-sm font-black text-neutral-900">
                  <span>Total</span>

                  <span className="font-mono text-pink-600">
                    ₱{subtotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleCheckout}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 bg-pink-500 text-white shadow-sm hover:bg-pink-600"
                >
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <button
                  onClick={handleViewFullCart}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white py-2 text-xs font-bold text-neutral-700 transition-colors hover:text-neutral-900"
                >
                  View Full Cart Page
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}