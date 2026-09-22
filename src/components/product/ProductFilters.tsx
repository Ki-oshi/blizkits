"use client";

import { useRouter } from "next/navigation";
import { Category } from "@/types/category";
import { cn } from "@/utils/cn";

interface ProductFiltersProps {
  categories: Category[];
  activeCategorySlug?: string;
}

export default function ProductFilters({ categories, activeCategorySlug }: ProductFiltersProps) {
  const router = useRouter();

  const handleSelectCategory = (slug?: string) => {
    if (slug) {
      router.push(`/shop?category=${slug}`);
    } else {
      router.push("/shop");
    }
  };

  return (
    <div className="space-y-6 sticky top-24">
      <div>
        <h3 className="text-sm font-bold tracking-wider text-neutral-900 uppercase">Categories</h3>
        <ul className="mt-4 space-y-3">
          <li>
            <button
              onClick={() => handleSelectCategory()}
              className={cn(
                "text-sm transition-colors hover:text-pink-500 text-left w-full cursor-pointer",
                !activeCategorySlug ? "font-semibold text-pink-500" : "text-neutral-600"
              )}
            >
              All Products
            </button>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <button
                onClick={() => handleSelectCategory(category.slug)}
                className={cn(
                  "text-sm transition-colors hover:text-pink-500 text-left w-full cursor-pointer",
                  activeCategorySlug === category.slug ? "font-semibold text-pink-500" : "text-neutral-600"
                )}
              >
                {category.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}