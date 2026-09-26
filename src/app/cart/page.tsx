"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import CartItem from "@/components/cart/CartItem";
import CartSummary from "@/components/cart/CartSummary";
import { createClient } from "@/lib/supabase/client";
import { ShoppingBag, Trash2, ArrowLeft, AlertCircle } from "lucide-react";
import { useRouter } from "nextjs-toploader/app";
import Link from "next/link";

export default function CartPage() {
  const { cart, selectedIds, selectAll, clearCart } = useCart();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function checkUserSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      setCheckingAuth(false);
    }

    checkUserSession();
  }, [supabase]);

  // Show loading spinner while determining auth state to prevent flashing wrong views
  if (checkingAuth) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center bg-white">
        <p className="animate-pulse text-xs font-medium text-neutral-400">
          Checking session...
        </p>
      </div>
    );
  }

  // If user is not logged in, prompt them to sign in or register first
  if (!user) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center bg-white py-20 md:py-28">
        <Container className="max-w-md space-y-6 text-center">
          <div className="shadow-xs mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
            <AlertCircle className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-neutral-900">
              Sign In Required
            </h1>

            <p className="text-xs text-neutral-500">
              Please sign in or create an account first to view your shopping
              cart, save items, and proceed with checkout.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/login?redirect=/cart" className="flex-1">
              <Button className="w-full cursor-pointer bg-pink-500 text-white shadow-sm hover:bg-pink-600">
                Sign In
              </Button>
            </Link>

            <Link href="/register?redirect=/cart" className="flex-1">
              <Button
                variant="outline"
                className="w-full cursor-pointer border-neutral-300 text-neutral-900 hover:bg-neutral-50"
              >
                Register
              </Button>
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  // If user is logged in but cart is empty
  if (cart.length === 0) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center bg-white py-20 md:py-28">
        <Container className="max-w-md space-y-4 text-center">
          <div className="shadow-xs mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-pink-100 bg-pink-50 text-pink-500">
            <ShoppingBag className="h-8 w-8" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-neutral-900">
            Your Cart is Empty
          </h1>

          <p className="text-xs text-neutral-500">
            Explore our collection of handmade custom keychains, K-pop
            photocards, and exclusive merch to get started.
          </p>

          <div className="pt-4">
            <Button
              onClick={() => router.push("/shop")}
              className="cursor-pointer bg-pink-500 px-6 text-white shadow-sm hover:bg-pink-600"
            >
              Explore Shop
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  const allSelected =
    cart.length > 0 && selectedIds.length === cart.length;

  return (
    <div className="min-h-[85vh] bg-white py-12 md:py-16">
      <Container className="max-w-6xl">
        <button
          onClick={() => router.push("/shop")}
          className="mb-6 flex cursor-pointer items-center gap-1.5 text-xs font-bold text-neutral-600 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </button>

        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-neutral-900">
              Shopping Cart
            </h1>

            <p className="mt-1 text-xs text-neutral-500">
              {cart.length} {cart.length === 1 ? "item" : "items"} in cart •{" "}
              <span className="font-bold text-neutral-900">
                {selectedIds.length} selected
              </span>{" "}
              for checkout
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-neutral-700">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => selectAll(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-neutral-300 text-pink-500 accent-pink-500 focus:ring-pink-500"
              />
              Select All
            </label>

            <button
              onClick={clearCart}
              className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-red-600 transition-colors hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Clear Cart
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Cart Items List */}
          <div className="space-y-4 lg:col-span-8">
            {cart.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
          </div>

          {/* Cart Summary Sidebar */}
          <div className="sticky top-6 lg:col-span-4">
            <CartSummary />
          </div>
        </div>
      </Container>
    </div>
  );
}