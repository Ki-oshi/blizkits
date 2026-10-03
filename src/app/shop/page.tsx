import {
  Suspense,
} from "react";

import Container from "@/components/ui/Container";
import ProductGrid from "@/components/product/ProductGrid";
import ProductFilters from "@/components/product/ProductFilters";
import ProductSearch from "@/components/product/ProductSearch";
import ShopAuthWarning from "@/components/product/ShopAuthWarning";

import { createClient } from "@/lib/supabase/server";

import { Product } from "@/types/product";
import { Category } from "@/types/category";

export const dynamic =
  "force-dynamic";

interface ShopPageProps {
  searchParams?: Promise<{
    category?: string;
    q?: string;
  }>;
}

/*
 * Normalize text so searching is
 * case-insensitive and hyphen/underscore
 * differences do not matter.
 *
 * Example:
 * "K-Pop" → "k pop"
 * "pink_keychain" → "pink keychain"
 */
function normalizeSearchValue(
  value: unknown
) {
  return String(
    value ?? ""
  )
    .toLowerCase()
    .replace(
      /[-_]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

export default async function ShopPage({
  searchParams,
}: ShopPageProps) {
  const params =
    (await searchParams) ??
    {};

  const activeCategorySlug =
    params.category;

  const searchQuery =
    params.q ?? "";

  const trimmedSearchQuery =
    searchQuery.trim();

  const hasSearch =
    trimmedSearchQuery.length >
    0;

  const supabase =
    await createClient();

  /* =======================================================
     AUTHENTICATION
  ======================================================= */

  const {
    data: { user },
    error: authError,
  } =
    await supabase.auth.getUser();

  if (
    authError ||
    !user
  ) {
    return (
      <ShopAuthWarning />
    );
  }

  /* =======================================================
     FETCH SHOP DATA
  ======================================================= */

  const [
    categoriesRes,
    productsRes,
  ] =
    await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("products")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),
    ]);

  const categories: Category[] =
    categoriesRes.data ??
    [];

  let rawProducts =
    productsRes.data ?? [];

  /*
   * Create a quick lookup so each
   * product can also be searched by
   * its category name.
   */
  const categoryNameById =
    new Map<string, string>(
      categories.map(
        (category) => [
          category.id,
          category.name,
        ]
      )
    );

  /* =======================================================
     CATEGORY FILTER
  ======================================================= */

  if (
    activeCategorySlug
  ) {
    const matchedCategory =
      categories.find(
        (category) =>
          category.slug ===
          activeCategorySlug
      );

    if (matchedCategory) {
      rawProducts =
        rawProducts.filter(
          (product) =>
            product.category_id ===
            matchedCategory.id
        );
    }
  }

  /* =======================================================
     FULL PRODUCT SEARCH
  ======================================================= */

  if (hasSearch) {
    const normalizedQuery =
      normalizeSearchValue(
        trimmedSearchQuery
      );

    /*
     * Splitting the search into terms
     * makes searches such as:
     *
     * "pink keychain"
     * "kpop charm"
     * "new photocard"
     *
     * work even when the words are in
     * different product fields.
     */
    const searchTerms =
      normalizedQuery
        .split(" ")
        .filter(Boolean);

    rawProducts =
      rawProducts.filter(
        (product) => {
          const categoryName =
            categoryNameById.get(
              product.category_id
            ) ?? "";

          const stockStatus =
            Number(
              product.stock ??
                0
            ) > 0
              ? "in stock available"
              : "sold out unavailable";

          const searchableText =
            normalizeSearchValue(
              [
                product.name,
                product.description,
                product.slug,
                categoryName,
                product.price,
                product.is_new
                  ? "new"
                  : "",
                product.featured
                  ? "featured"
                  : "",
                stockStatus,
              ].join(" ")
            );

          return searchTerms.every(
            (term) =>
              searchableText.includes(
                term
              )
          );
        }
      );
  }

  /* =======================================================
     MAP PRODUCTS
  ======================================================= */

  const products: Product[] =
    rawProducts.map(
      (product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description:
          product.description,
        price: product.price,
        categoryId:
          product.category_id,
        images:
          Array.isArray(
            product.images
          )
            ? product.images
            : [],
        stock: product.stock,
        featured:
          product.featured,
        isNew:
          product.is_new,
      })
    );

  const activeCategoryName =
    categories.find(
      (category) =>
        category.slug ===
        activeCategorySlug
    )?.name ?? "Shop";

  /* =======================================================
     PAGE HEADING
  ======================================================= */

  const pageTitle =
    hasSearch
      ? `Search results for "${trimmedSearchQuery}"`
      : activeCategorySlug
        ? activeCategoryName
        : "Shop All";

  const resultText =
    products.length === 1
      ? "1 product found"
      : `${products.length} products found`;

  return (
    <div className="bg-white py-12 md:py-16">
      <Container>
        {/* Header */}
        <div className="mb-10 flex flex-col gap-5 border-b border-neutral-100 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              {pageTitle}
            </h1>

            {hasSearch ? (
              <p className="mt-2 text-sm text-neutral-500">
                {resultText}
              </p>
            ) : (
              <p className="mt-2 max-w-2xl text-base text-neutral-500">
                Discover
                BLIZKITS
                aesthetic
                accessories,
                custom
                keychains, and
                authentic K-Pop
                photocards.
              </p>
            )}
          </div>

          <Suspense
            fallback={
              <div className="h-10 w-72 animate-pulse rounded-xl bg-neutral-100" />
            }
          >
            <ProductSearch />
          </Suspense>
        </div>

        {/* Products */}
        <div className="grid grid-cols-1 lg:grid-cols-4 lg:gap-x-8">
          {/* Filters */}
          <aside className="hidden border-r border-neutral-100 pr-6 lg:col-span-1 lg:block">
            <ProductFilters
              categories={
                categories
              }
              activeCategorySlug={
                activeCategorySlug
              }
            />
          </aside>

          {/* Product Grid */}
          <main className="mt-6 lg:col-span-3 lg:mt-0">
            <ProductGrid
              products={
                products
              }
              emptyMessage={
                hasSearch
                  ? `No products found for "${trimmedSearchQuery}". Try another search term.`
                  : "No products match your search criteria."
              }
            />
          </main>
        </div>
      </Container>
    </div>
  );
}