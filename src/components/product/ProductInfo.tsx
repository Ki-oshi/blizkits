"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { Product } from "@/types/product";
import { useCart } from "@/context/CartContext";
import {
  Check,
  ShoppingBag,
  AlertCircle,
} from "lucide-react";

interface ProductInfoProps {
  product: Product;
}

export default function ProductInfo({
  product,
}: ProductInfoProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const { addToCart } = useCart();

  const handleAddToCart = async () => {
    await addToCart(product, quantity);

    setIsAdded(true);

    setTimeout(() => {
      setIsAdded(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col pt-4 lg:pt-0">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
        {product.name}
      </h1>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-2xl font-medium text-neutral-900">
          ₱{product.price.toLocaleString()}
        </p>

        {/* Stock Badge */}
        <div>
          {product.stock > 0 ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                product.stock <= 3
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {product.stock <= 3 && (
                <AlertCircle className="h-3.5 w-3.5" />
              )}

              {product.stock} left in stock
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
              Out of stock
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="mt-8">
        <h3 className="text-sm font-medium text-neutral-900">
          Description
        </h3>

        <p className="mt-2 text-base leading-relaxed text-neutral-600">
          {product.description}
        </p>
      </div>

      {/* Cart Section */}
      <div className="mt-10 border-t border-neutral-100 pt-8">
        {product.stock > 0 ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Quantity */}
            <div className="flex items-center rounded-full border border-neutral-200 bg-white">
              <button
                type="button"
                onClick={() =>
                  setQuantity(
                    Math.max(1, quantity - 1)
                  )
                }
                className="cursor-pointer px-4 py-3 text-neutral-600 transition-colors hover:text-pink-500"
              >
                -
              </button>

              <span className="w-8 text-center text-sm font-semibold text-neutral-900">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() =>
                  setQuantity(
                    Math.min(
                      product.stock,
                      quantity + 1
                    )
                  )
                }
                className="cursor-pointer px-4 py-3 text-neutral-600 transition-colors hover:text-pink-500"
              >
                +
              </button>
            </div>

            {/* Add to Cart */}
            <Button
              size="lg"
              className={`w-full transition-all duration-300 sm:flex-1 ${
                isAdded
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : ""
              }`}
              onClick={handleAddToCart}
            >
              {isAdded ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="h-5 w-5 animate-bounce" />
                  Added to Cart!
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Add to Cart
                </span>
              )}
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            variant="outline"
            disabled
            className="w-full"
          >
            Sold Out
          </Button>
        )}
      </div>
    </div>
  );
}