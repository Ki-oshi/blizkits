"use client";

import Link from "next/link";
import { Product } from "@/types/product";
import { useCart } from "@/context/CartContext";
import { ShoppingBag } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const thumbnail = product.images[0] || "/placeholder.jpg";
  const { addToCart } = useCart();

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to the product detail page when clicking quick add
    if (product.stock > 0) {
      void addToCart(product, 1);
    }
  };

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
        
        {/* Dynamic Database Badges */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          {product.isNew && (
            <span className="rounded-full bg-pink-500 px-3 py-1 text-[10px] font-bold tracking-wider text-white shadow-sm">
              NEW
            </span>
          )}
          {product.stock > 0 && product.stock <= 3 && (
            <span className="rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold tracking-wider text-white shadow-sm">
              LOW STOCK
            </span>
          )}
        </div>

        <img
          src={thumbnail}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Sold Out Overlay */}
        {product.stock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <span className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-bold tracking-widest text-white shadow-sm">
              SOLD OUT
            </span>
          </div>
        )}

        {/* Quick Add to Cart Button (Appears on Hover) */}
        {product.stock > 0 && (
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={handleQuickAdd}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-900 shadow-md hover:bg-pink-500 hover:text-white transition-colors cursor-pointer"
              title="Quick Add to Cart"
            >
              <ShoppingBag className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col space-y-1">
        <h3 className="text-base font-medium text-neutral-900 transition-colors group-hover:text-pink-500 line-clamp-1">
          {product.name}
        </h3>
        <p className="text-sm font-semibold text-neutral-500">
          ₱{product.price.toLocaleString()}
        </p>
      </div>
    </Link>
  );
}