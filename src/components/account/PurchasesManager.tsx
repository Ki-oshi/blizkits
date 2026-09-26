"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import Button from "@/components/ui/Button";
import {
  Package,
  ShoppingBag,
  Clock,
  ChevronRight,
  ArrowLeft,
  Truck,
} from "lucide-react";

interface PurchasesManagerProps {
  initialOrders: any[];
}

export default function PurchasesManager({
  initialOrders = [],
}: PurchasesManagerProps) {
  const router = useRouter();
  const [orders] = useState(initialOrders || []);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // If viewing a specific order's details
  if (selectedOrder) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedOrder(null)}
          className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to All Purchases
        </button>

        <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-2 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-500">
                Order ID
              </span>

              <h2 className="font-mono text-lg font-bold text-neutral-900">
                #{selectedOrder.id}
              </h2>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-100 bg-pink-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-pink-700">
              <Truck className="h-3.5 w-3.5" />
              {selectedOrder.status || "Processing"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
            <div className="space-y-1 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
              <p className="font-bold uppercase tracking-wider text-neutral-800">
                Order Date
              </p>

              <p className="text-neutral-600">
                {new Date(selectedOrder.created_at).toLocaleString()}
              </p>
            </div>

            <div className="space-y-1 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
              <p className="font-bold uppercase tracking-wider text-neutral-800">
                Total Amount
              </p>

              <p className="text-base font-black text-neutral-900">
                ₱{selectedOrder.total_amount?.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Order Summary
            </h3>

            <div className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200">
              <div className="flex items-center justify-between bg-neutral-50 p-4 text-xs font-bold text-neutral-700">
                <span>Items Total</span>
                <span>
                  ₱{selectedOrder.total_amount?.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 text-xs text-neutral-600">
                <span>Shipping Fee</span>

                <span className="font-medium text-emerald-600">
                  FREE
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">
            My Purchases
          </h2>

          <p className="mt-1 text-xs text-neutral-500">
            Track your active and past orders securely.
          </p>
        </div>

        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
          {orders.length} {orders.length === 1 ? "Order" : "Orders"}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-12 text-center">
          <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-neutral-400" />

          <p className="text-sm font-medium text-neutral-900">
            No purchase history yet
          </p>

          <p className="mb-6 mt-1 text-xs text-neutral-500">
            Explore our catalog and place your first order.
          </p>

          <Button
            onClick={() => router.push("/shop")}
            className="cursor-pointer bg-pink-500 text-white hover:bg-pink-600"
          >
            Start Shopping
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="flex cursor-pointer flex-col justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:border-pink-300 sm:flex-row sm:items-center"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-neutral-900">
                    #{order.id.slice(0, 8)}
                  </span>

                  <span className="inline-flex items-center rounded bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    {order.status || "Processing"}
                  </span>
                </div>

                <p className="flex items-center gap-1 pt-1 text-xs text-neutral-500">
                  <Clock className="h-3 w-3" />
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center justify-between gap-6 sm:justify-end">
                <div className="text-left sm:text-right">
                  <p className="text-sm font-black text-neutral-900">
                    ₱{order.total_amount?.toLocaleString()}
                  </p>
                </div>

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}