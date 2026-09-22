import Link from "next/link";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import ProductGrid from "@/components/product/ProductGrid";
import { createClient } from "@/lib/supabase/server";
import { Product } from "@/types/product";
import { Sparkles, ShieldCheck, Truck, Disc } from "lucide-react";

// Force Next.js to dynamically render this page so inventory changes appear instantly
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch Featured products and New Arrivals in parallel for maximum performance
  const [featuredRes, newRes, categoriesRes] = await Promise.all([
    supabase.from("products").select("*").eq("featured", true).order("created_at", { ascending: false }).limit(4),
    supabase.from("products").select("*").eq("is_new", true).order("created_at", { ascending: false }).limit(4),
    supabase.from("categories").select("*").limit(3)
  ]);

  const mapProducts = (data: any[] | null): Product[] => (data || []).map((p) => ({
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

  const featuredProducts = mapProducts(featuredRes.data);
  const newProducts = mapProducts(newRes.data);
  const categories = categoriesRes.data || [];

  return (
    <main className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-neutral-900 py-24 sm:py-36 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ec4899_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <Container className="relative z-10 text-center">
          <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20 mb-6">
            <Disc className="h-3.5 w-3.5" /> K-Pop Merch & Custom Collectibles
          </span>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
            Elevate your bias <br className="hidden sm:block" /> with <span className="text-pink-500">BLIZKITS</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-neutral-300 leading-relaxed">
            Discover our exclusive collection of K-pop photocards, handmade custom keychains, and fan merchandise designed for collectors.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/shop" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-pink-500 hover:bg-pink-600 text-white border-0 shadow-lg shadow-pink-500/25 cursor-pointer">
                Shop All Collections
              </Button>
            </Link>
            <Link href="/faq" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-white border-neutral-700 hover:bg-neutral-800 cursor-pointer">
                Learn More
              </Button>
            </Link>
          </div>
        </Container>
      </section>

      {/* Trust Badges Strip */}
      <section className="border-b border-neutral-100 bg-neutral-50/50 py-8">
        <Container>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center space-x-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-50 text-pink-500">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Custom Keychains</h3>
                <p className="text-xs text-neutral-500">Handmade aesthetic charms tailored to perfection.</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-50 text-pink-500">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Nationwide Shipping</h3>
                <p className="text-xs text-neutral-500">Safe packaging for your photocards and merch.</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-4 sm:col-span-2 lg:col-span-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-50 text-pink-500">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Secure Checkout</h3>
                <p className="text-xs text-neutral-500">Protected data and reliable payment methods.</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Categories Quick Links */}
      {categories.length > 0 && (
        <section className="py-16 sm:py-20">
          <Container>
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">Explore Categories</h2>
              <p className="mt-2 text-sm text-neutral-500">Find the exact photocards and keychains you are looking for.</p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {categories.map((cat: any) => (
                <Link 
                  key={cat.id} 
                  href={`/shop?category=${cat.slug}`}
                  className="group relative flex flex-col justify-end overflow-hidden rounded-2xl bg-neutral-100 p-8 h-64 border border-neutral-200 hover:border-pink-500 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <div className="relative z-10">
                    <span className="text-xs font-semibold uppercase tracking-wider text-pink-500">Collection</span>
                    <h3 className="text-xl font-bold text-neutral-900 mt-1 group-hover:text-pink-600 transition-colors">{cat.name}</h3>
                    <p className="text-xs text-neutral-500 mt-2 line-clamp-2">{cat.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Featured Products Section */}
      <section className="py-16 sm:py-20 bg-neutral-50/50">
        <Container>
          <div className="flex items-center justify-between mb-10 border-b border-neutral-200 pb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">Featured Drops</h2>
              <p className="text-sm text-neutral-500 mt-1">Handpicked photocards and merch loved by collectors.</p>
            </div>
            <Link href="/shop" className="text-sm font-semibold text-pink-500 hover:text-pink-600 transition-colors">
              View all &rarr;
            </Link>
          </div>
          
          <ProductGrid 
            products={featuredProducts} 
            emptyMessage="Check back soon for new featured drops." 
          />
        </Container>
      </section>

      {/* New Arrivals Section */}
      {newProducts.length > 0 && (
        <section className="py-16 sm:py-20">
          <Container>
            <div className="flex items-center justify-between mb-10 border-b border-neutral-200 pb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">Just Landed</h2>
                <p className="text-sm text-neutral-500 mt-1">The newest additions to our collection.</p>
              </div>
              <Link href="/shop" className="text-sm font-semibold text-pink-500 hover:text-pink-600 transition-colors">
                View all &rarr;
              </Link>
            </div>
            
            <ProductGrid 
              products={newProducts} 
              emptyMessage="No new items right now." 
            />
          </Container>
        </section>
      )}
    </main>
  );
}