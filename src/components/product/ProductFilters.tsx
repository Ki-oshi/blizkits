"use client";

import { useRouter } from "nextjs-toploader/app";
import { Category } from "@/types/category";
import { cn } from "@/utils/cn";

interface ProductFiltersProps {
  categories: Category[];
  activeCategorySlug?: string;
}

export default function ProductFilters({
  categories,
  activeCategorySlug,
}: ProductFiltersProps) {
  const router = useRouter();

  const handleSelectCategory = (slug?: string) => {
    if (slug) {
      router.push(`/shop?category=${slug}`);
    } else {
      router.push("/shop");
    }
  };

  return (
    <div className="sticky top-24 space-y-6">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
          Categories
        </h3>

        <ul className="mt-4 space-y-3">
          <li>
            <button
              onClick={() => handleSelectCategory()}
              className={cn(
                "w-full cursor-pointer text-left text-sm transition-colors hover:text-pink-500",
                !activeCategorySlug
                  ? "font-semibold text-pink-500"
                  : "text-neutral-600"
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
                  "w-full cursor-pointer text-left text-sm transition-colors hover:text-pink-500",
                  activeCategorySlug === category.slug
                    ? "font-semibold text-pink-500"
                    : "text-neutral-600"
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