import Container from "@/components/ui/Container";
import ProductGrid from "@/components/product/ProductGrid";
import ProductFilters from "@/components/product/ProductFilters";
import ProductSearch from "@/components/product/ProductSearch";
import { createClient } from "@/lib/supabase/server";
import { Product } from "@/types/product";
import { Category } from "@/types/category";
import ShopAuthWarning from "@/components/product/ShopAuthWarning";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface ShopPageProps {
  searchParams?: Promise<{
    category?: string;
    q?: string;
  }>;
}

export default async function ShopPage({
  searchParams,
}: ShopPageProps) {
  const params = (await searchParams) ?? {};

  const activeCategorySlug = params.category;
  const searchQuery = params.q ?? "";

  const supabase = await createClient();

  // Require authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return <ShopAuthWarning />;
  }

  // Fetch categories and products
  const [categoriesRes, productsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true }),

    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const categories: Category[] = categoriesRes.data ?? [];
  let rawProducts = productsRes.data ?? [];

  // Filter by category
  if (activeCategorySlug) {
    const matchedCategory = categories.find(
      (category) => category.slug === activeCategorySlug
    );

    if (matchedCategory) {
      rawProducts = rawProducts.filter(
        (product) => product.category_id === matchedCategory.id
      );
    }
  }

  // Filter by search
  if (searchQuery.trim()) {
    const queryLower = searchQuery.trim().toLowerCase();

    rawProducts = rawProducts.filter((product) => {
      const name = product.name?.toLowerCase() ?? "";
      const description = product.description?.toLowerCase() ?? "";

      return (
        name.includes(queryLower) ||
        description.includes(queryLower)
      );
    });
  }

  // Convert DB rows to Product type
  const products: Product[] = rawProducts.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    categoryId: product.category_id,
    images: product.images,
    stock: product.stock,
    featured: product.featured,
    isNew: product.is_new,
  }));

  const activeCategoryName =
    categories.find(
      (category) => category.slug === activeCategorySlug
    )?.name ?? "Shop";

  return (
    <div className="bg-white py-12 md:py-16">
      <Container>
        {/* Header */}
        <div className="mb-10 flex flex-col gap-4 border-b border-neutral-100 pb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              {activeCategorySlug
                ? activeCategoryName
                : searchQuery
                  ? `Search results for "${searchQuery}"`
                  : "Shop All"}
            </h1>

            <p className="mt-2 text-base text-neutral-500">
              Discover BLIZKITS aesthetic accessories, custom keychains,
              and authentic K-Pop photocards.
            </p>
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
              categories={categories}
              activeCategorySlug={activeCategorySlug}
            />
          </aside>

          {/* Product Grid */}
          <main className="mt-6 lg:col-span-3 lg:mt-0">
            <ProductGrid
              products={products}
              emptyMessage="No products match your search criteria."
            />
          </main>
        </div>
      </Container>
    </div>
  );
}
