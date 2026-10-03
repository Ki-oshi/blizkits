"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({
  product,
}: ProductCardProps) {
  const thumbnail =
    product.images?.[0] || "/placeholder.svg";

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block"
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
        {/* Dynamic Database Badges */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          {product.isNew && (
            <span className="rounded-full bg-pink-500 px-3 py-1 text-[10px] font-bold tracking-wider text-white shadow-sm">
              NEW
            </span>
          )}

          {product.stock > 0 &&
            product.stock <= 3 && (
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

        {/* View Item Action */}
        <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-lg transition-colors group-hover:bg-pink-500 group-hover:text-white">
            <span>View Item</span>

            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col space-y-1">
        <h3 className="line-clamp-1 text-base font-medium text-neutral-900 transition-colors group-hover:text-pink-500">
          {product.name}
        </h3>

        <p className="text-sm font-semibold text-neutral-500">
          ₱{product.price.toLocaleString()}
        </p>
      </div>
    </Link>
  );
}