"use client";

import { useState } from "react";
import {
  AlertCircle,
  Check,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types/product";

interface ProductInfoProps {
  product: Product;
}

export default function ProductInfo({
  product,
}: ProductInfoProps) {
  const [quantity, setQuantity] =
    useState(1);

  const [isAdded, setIsAdded] =
    useState(false);

  const [isAdding, setIsAdding] =
    useState(false);

  const { addToCart } = useCart();

  const isSoldOut =
    product.stock <= 0;

  const isLowStock =
    product.stock > 0 &&
    product.stock <= 3;

  const decreaseQuantity = () => {
    setQuantity((current) =>
      Math.max(
        1,
        current - 1
      )
    );
  };

  const increaseQuantity = () => {
    setQuantity((current) =>
      Math.min(
        product.stock,
        current + 1
      )
    );
  };

  const handleAddToCart =
    async () => {
      if (
        isSoldOut ||
        isAdding
      ) {
        return;
      }

      try {
        setIsAdding(true);

        await addToCart(
          product,
          quantity
        );

        setIsAdded(true);

        window.setTimeout(
          () => {
            setIsAdded(
              false
            );
          },
          2000
        );
      } finally {
        setIsAdding(false);
      }
    };

  return (
    <div className="flex flex-col">
      {/* Status */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {product.isNew && (
          <span className="inline-flex rounded-full bg-pink-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-pink-600">
            New
          </span>
        )}

        {isLowStock && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" />

            Low stock
          </span>
        )}

        {!isSoldOut &&
          !isLowStock && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

              In stock
            </span>
          )}

        {isSoldOut && (
          <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-600">
            Sold out
          </span>
        )}
      </div>

      {/* Product Name */}
      <h1 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl lg:text-[42px] lg:leading-[1.08]">
        {product.name}
      </h1>

      {/* Price */}
      <div className="mt-5 flex items-end justify-between gap-4 border-b border-neutral-100 pb-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400">
            Price
          </p>

          <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
            ₱
            {product.price.toLocaleString(
              "en-PH",
              {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }
            )}
          </p>
        </div>

        {!isSoldOut && (
          <p className="text-sm font-medium text-neutral-500">
            {product.stock}{" "}
            {product.stock ===
            1
              ? "item"
              : "items"}{" "}
            available
          </p>
        )}
      </div>

      {/* Description */}
      <div className="py-7">
        <h2 className="text-sm font-bold text-neutral-900">
          Description
        </h2>

        <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-neutral-600">
          {product.description ||
            "No description available for this product."}
        </p>
      </div>

      {/* Purchase Section */}
      <div className="border-t border-neutral-100 pt-7">
        {!isSoldOut ? (
          <div className="space-y-5">
            {/* Quantity */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-bold text-neutral-900">
                  Quantity
                </label>

                <span className="text-xs text-neutral-400">
                  Maximum{" "}
                  {
                    product.stock
                  }
                </span>
              </div>

              <div className="flex h-12 w-full items-center justify-between rounded-xl border border-neutral-200 bg-white sm:w-40">
                <button
                  type="button"
                  onClick={
                    decreaseQuantity
                  }
                  disabled={
                    quantity <= 1
                  }
                  aria-label="Decrease quantity"
                  className="flex h-full w-12 cursor-pointer items-center justify-center rounded-l-xl text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-pink-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <span className="min-w-10 text-center text-sm font-bold text-neutral-900">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={
                    increaseQuantity
                  }
                  disabled={
                    quantity >=
                    product.stock
                  }
                  aria-label="Increase quantity"
                  className="flex h-full w-12 cursor-pointer items-center justify-center rounded-r-xl text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-pink-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <Button
              size="lg"
              disabled={
                isAdding
              }
              onClick={
                handleAddToCart
              }
              className={`h-14 w-full rounded-xl text-sm font-bold transition-all duration-300 ${
                isAdded
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-neutral-950 text-white hover:bg-pink-500"
              }`}
            >
              {isAdding ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />

                  Adding...
                </span>
              ) : isAdded ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="h-5 w-5" />

                  Added to Cart
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShoppingBag className="h-5 w-5" />

                  Add to Cart
                </span>
              )}
            </Button>

            <p className="text-center text-xs leading-5 text-neutral-400">
              Select your
              preferred quantity
              before adding this
              item to your cart.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              size="lg"
              variant="outline"
              disabled
              className="h-14 w-full rounded-xl"
            >
              Sold Out
            </Button>

            <p className="text-center text-xs text-neutral-400">
              This item is
              currently unavailable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}