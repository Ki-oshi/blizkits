import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";

import Container from "@/components/ui/Container";
import ProductGallery from "@/components/product/ProductGallery";
import ProductInfo from "@/components/product/ProductInfo";
import ProductGrid from "@/components/product/ProductGrid";
import { createClient } from "@/lib/supabase/server";
import { Product } from "@/types/product";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const resolvedParams = await params;
  const supabase = await createClient();

  /* =======================================================
     PRODUCT
  ======================================================= */

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", resolvedParams.slug)
    .single();

  if (error || !data) {
    notFound();
  }

  const product: Product = {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    price: data.price,
    categoryId: data.category_id,
    images: Array.isArray(data.images)
      ? data.images
      : [],
    stock: data.stock,
    featured: data.featured,
    isNew: data.is_new,
  };

  /* =======================================================
     RELATED PRODUCTS
  ======================================================= */

  const { data: relatedData } = await supabase
    .from("products")
    .select("*")
    .eq(
      "category_id",
      product.categoryId
    )
    .neq("id", product.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(4);

  const relatedProducts: Product[] = (
    relatedData ?? []
  ).map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description,
    price: item.price,
    categoryId: item.category_id,
    images: Array.isArray(item.images)
      ? item.images
      : [],
    stock: item.stock,
    featured: item.featured,
    isNew: item.is_new,
  }));

  return (
    <div className="min-h-screen bg-white">
      <Container>
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 py-6 text-sm text-neutral-500"
        >
          <Link
            href="/shop"
            className="transition-colors hover:text-pink-500"
          >
            Shop
          </Link>

          <ChevronRight className="h-4 w-4 text-neutral-300" />

          <span className="max-w-[220px] truncate font-medium text-neutral-800 sm:max-w-md">
            {product.name}
          </span>
        </nav>

        {/* Main Product */}
        <section className="pb-16 md:pb-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:gap-14 xl:gap-20">
            {/* Gallery */}
            <div className="min-w-0">
              <ProductGallery
                images={
                  product.images
                }
                productName={
                  product.name
                }
                isNew={
                  product.isNew
                }
              />
            </div>

            {/* Product Details */}
            <div className="min-w-0">
              <div className="lg:sticky lg:top-24">
                <ProductInfo
                  product={
                    product
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length >
          0 && (
          <section className="border-t border-neutral-100 py-16 md:py-20">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-pink-500">
                  More to explore
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                  You might also
                  like
                </h2>
              </div>

              <Link
                href="/shop"
                className="text-sm font-semibold text-neutral-500 transition-colors hover:text-pink-500"
              >
                View all products
              </Link>
            </div>

            <ProductGrid
              products={
                relatedProducts
              }
            />
          </section>
        )}
      </Container>
    </div>
  );
}