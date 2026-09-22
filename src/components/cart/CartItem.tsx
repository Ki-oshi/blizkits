"use client";

import { useCart, CartItem as CartItemType } from "@/context/CartContext";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const { selectedIds, toggleSelect, removeFromCart, updateQuantity } = useCart();
  const isSelected = selectedIds.includes(item.id);

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border bg-white shadow-2xs transition-all ${
      isSelected ? "border-pink-300 ring-1 ring-pink-300/50" : "border-neutral-200"
    }`}>
      <div className="flex items-center gap-4">
        <input 
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelect(item.id)}
          className="h-4 w-4 rounded border-neutral-300 text-pink-500 focus:ring-pink-500 cursor-pointer accent-pink-500"
          aria-label={`Select ${item.name}`}
        />

        {item.image_url ? (
          <img 
            src={item.image_url} 
            alt={item.name} 
            className="h-20 w-20 object-cover rounded-xl border border-neutral-200 bg-neutral-50 shrink-0" 
          />
        ) : (
          <div className="h-20 w-20 flex items-center justify-center rounded-xl bg-pink-50 text-pink-500 border border-pink-100 shrink-0">
            <ShoppingBag className="h-6 w-6" />
          </div>
        )}

        <div className="space-y-1">
          <h3 className="text-sm font-bold text-neutral-900">{item.name}</h3>
          <p className="text-xs font-black text-pink-600 font-mono">₱{item.price?.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
        {/* Quantity Controller */}
        <div className="flex items-center border border-neutral-300 rounded-xl bg-white overflow-hidden shadow-2xs">
          <button 
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            className="px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="px-3 text-xs font-bold text-neutral-900">{item.quantity}</span>
          <button 
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            className="px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <div className="text-right min-w-[80px]">
          <p className="text-sm font-black text-neutral-900 font-mono">
            ₱{(item.price * item.quantity).toLocaleString()}
          </p>
        </div>

        <button 
          onClick={() => removeFromCart(item.id)}
          className="p-2 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer rounded-lg hover:bg-neutral-50"
          title="Remove item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}