"use client";

import { useCart } from "@/context/CartContext";
import Button from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "nextjs-toploader/app";

interface CartSummaryProps {
  onCheckoutComplete?: () => void;
}

export default function CartSummary({
  onCheckoutComplete,
}: CartSummaryProps) {
  const { selectedSubtotal, selectedItemsCount } = useCart();
  const router = useRouter();

  const handleCheckout = () => {
    if (selectedItemsCount === 0) return;

    if (onCheckoutComplete) {
      onCheckoutComplete();
    }

    router.push("/checkout");
  };

  return (
    <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="border-b border-neutral-100 pb-4 text-base font-bold text-neutral-900">
        Order Summary ({selectedItemsCount} selected)
      </h2>

      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between text-neutral-600">
          <span>Selected Subtotal</span>

          <span className="font-mono font-bold text-neutral-900">
            ₱{selectedSubtotal.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between text-neutral-600">
          <span>Estimated Shipping</span>

          <span className="font-bold text-emerald-600">
            Calculated at Checkout
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-sm font-black text-neutral-900">
          <span>Total Selected</span>

          <span className="font-mono text-base text-pink-600">
            ₱{selectedSubtotal.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="pt-2">
        <Button
          onClick={handleCheckout}
          disabled={selectedItemsCount === 0}
          className="flex w-full cursor-pointer items-center justify-center gap-2 bg-pink-500 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-pink-600 disabled:bg-neutral-300"
        >
          Proceed to Checkout
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}