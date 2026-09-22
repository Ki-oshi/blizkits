"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Package, ShoppingBag, Clock, ChevronRight, ArrowLeft, Truck } from "lucide-react";

interface PurchasesManagerProps {
  initialOrders: any[];
}

export default function PurchasesManager({ initialOrders = [] }: PurchasesManagerProps) {
  const router = useRouter();
  const [orders] = useState(initialOrders || []);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // If viewing a specific order's details
  if (selectedOrder) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedOrder(null)}
          className="text-xs font-bold text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to All Purchases
        </button>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-100 pb-4 gap-2">
            <div>
              <span className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-wider">Order ID</span>
              <h2 className="text-lg font-bold text-neutral-900 font-mono">#{selectedOrder.id}</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-pink-50 text-pink-700 border border-pink-100">
              <Truck className="h-3.5 w-3.5" /> {selectedOrder.status || "Processing"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1">
              <p className="font-bold text-neutral-800 uppercase tracking-wider">Order Date</p>
              <p className="text-neutral-600">{new Date(selectedOrder.created_at).toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1">
              <p className="font-bold text-neutral-800 uppercase tracking-wider">Total Amount</p>
              <p className="text-base font-black text-neutral-900">₱{selectedOrder.total_amount?.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Order Summary</h3>
            <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
              <div className="p-4 bg-neutral-50 flex items-center justify-between text-xs font-bold text-neutral-700">
                <span>Items Total</span>
                <span>₱{selectedOrder.total_amount?.toLocaleString()}</span>
              </div>
              <div className="p-4 flex items-center justify-between text-xs text-neutral-600">
                <span>Shipping Fee</span>
                <span className="font-medium text-emerald-600">FREE</span>
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
          <h2 className="text-xl font-bold text-neutral-900">My Purchases</h2>
          <p className="text-xs text-neutral-500 mt-1">Track your active and past orders securely.</p>
        </div>
        <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full">
          {orders.length} {orders.length === 1 ? "Order" : "Orders"}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
          <ShoppingBag className="mx-auto h-8 w-8 text-neutral-400 mb-3" />
          <p className="text-sm font-medium text-neutral-900">No purchase history yet</p>
          <p className="text-xs text-neutral-500 mt-1 mb-6">Explore our catalog and place your first order.</p>
          <Button onClick={() => router.push("/shop")} className="bg-pink-500 hover:bg-pink-600 text-white cursor-pointer">
            Start Shopping
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div 
              key={order.id} 
              onClick={() => setSelectedOrder(order)}
              className="p-5 rounded-2xl border border-neutral-200 bg-white hover:border-pink-300 transition-all cursor-pointer shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-neutral-900">#{order.id.slice(0, 8)}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                    {order.status || "Processing"}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 flex items-center gap-1 pt-1">
                  <Clock className="h-3 w-3" /> {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6">
                <div className="text-left sm:text-right">
                  <p className="text-sm font-black text-neutral-900">₱{order.total_amount?.toLocaleString()}</p>
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