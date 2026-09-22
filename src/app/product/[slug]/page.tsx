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

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  const supabase = await createClient();

  // 1. Fetch the specific product matching the slug
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", resolvedParams.slug)
    .single();

  if (error || !data) {
    notFound();
  }

  // 2. Map the database row to our TypeScript interface
  const product: Product = {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    price: data.price,
    categoryId: data.category_id,
    images: data.images,
    stock: data.stock,
    featured: data.featured,
    isNew: data.is_new,
  };

  // 3. Fetch related products from the same category (excluding the current item), limited to 4
  const { data: relatedData } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", product.categoryId)
    .neq("id", product.id)
    .limit(4);

  const relatedProducts: Product[] = (relatedData || []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    categoryId: p.category_id,
    images: p.images,
    stock: p.stock,
    featured: p.featured,
    isNew: p.is_new,
  }));

  return (
    <div className="bg-white py-12 md:py-16">
      <Container>
        {/* Main Product Section */}
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-12">
          {/* Left Side: Image Gallery */}
          <ProductGallery 
            images={product.images} 
            productName={product.name} 
            isNew={product.isNew} 
          />
          
          {/* Right Side: Product Details & Cart Actions */}
          <div className="mt-10 px-4 sm:mt-16 sm:px-0 lg:mt-0">
            <ProductInfo product={product} />
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 border-t border-neutral-100 pt-16">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mb-8">
              You might also like
            </h2>
            <ProductGrid products={relatedProducts} />
          </div>
        )}
      </Container>
    </div>
  );
}