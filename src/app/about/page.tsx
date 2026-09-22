import Link from "next/link";
import Image from "next/image";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { Sparkles, Heart, ShieldCheck, Disc } from "lucide-react";

// Force Next.js to dynamically render so stats reflect real-time DB counts
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const supabase = await createClient();

  // Fetch live metrics from Supabase in parallel
  const [productsRes, categoriesRes] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("categories").select("*", { count: "exact", head: true }),
  ]);

  const totalProducts = productsRes.count || 0;
  const totalCategories = categoriesRes.count || 0;

  return (
    <div className="bg-white py-16 sm:py-24">
      <Container>
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold bg-pink-50 text-pink-500 border border-pink-100 mb-4">
            <Disc className="h-3.5 w-3.5" /> Made for Collectors & Fans
          </span>
          <h1 className="text-4xl font-black tracking-tight text-neutral-900 sm:text-5xl">
            About <span className="text-pink-500">BLIZKITS</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-neutral-600">
            Elevating your bias collection with custom handmade keychains, official K-pop photocards, and exclusive fan merchandise.
          </p>
        </div>

        {/* Live Metrics Strip (Dynamic from Database) */}
        <div className="mx-auto mt-16 max-w-4xl grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-6 text-center shadow-sm">
            <p className="text-3xl font-black text-neutral-900">{totalProducts}+</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Unique Merch Items</p>
          </div>
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-6 text-center shadow-sm">
            <p className="text-3xl font-black text-neutral-900">{totalCategories}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Curated Collections</p>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-neutral-100 bg-neutral-50/50 p-6 text-center shadow-sm">
            <p className="text-3xl font-black text-pink-500">100%</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Collector Trusted</p>
          </div>
        </div>

        {/* Story Section */}
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-5xl">
          <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:gap-x-16 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-neutral-900">Our Story</h2>
              <p className="mt-6 text-base leading-relaxed text-neutral-600">
                BLIZKITS was created out of a genuine love for K-pop culture and collector aesthetics. We understand how thrilling it is to find rare photocards and design custom accessories that represent your favorite bias.
              </p>
              <p className="mt-4 text-base leading-relaxed text-neutral-600">
                Every handmade keychain is carefully crafted, and every photocard is handled with strict care to ensure it reaches collectors in pristine condition.
              </p>
            </div>
            
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-100 shadow-md">
              <Image 
                src="https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=800&auto=format&fit=crop" 
                alt="BLIZKITS studio setup" 
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Values / Offerings */}
        <div className="mx-auto mt-24 max-w-2xl lg:max-w-5xl">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 text-center mb-12">What We Offer</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="rounded-2xl bg-neutral-50 p-8 border border-neutral-100">
              <span className="text-4xl font-black text-pink-200">01</span>
              <h3 className="mt-4 text-lg font-semibold text-neutral-900">K-Pop Photocards</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                Sourced securely and packaged safely with rigid sleeves and top loaders to protect your collection.
              </p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-8 border border-neutral-100">
              <span className="text-4xl font-black text-pink-200">02</span>
              <h3 className="mt-4 text-lg font-semibold text-neutral-900">Handmade Keychains</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                Custom-designed acrylic and beaded statement keychains tailored for your bags, lightsticks, or keys.
              </p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-8 border border-neutral-100">
              <span className="text-4xl font-black text-pink-200">03</span>
              <h3 className="mt-4 text-lg font-semibold text-neutral-900">Exclusive Merch</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                Curated apparel and fandom gear designed to bring a bold, aesthetic edge to your everyday style.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 rounded-3xl bg-neutral-900 px-6 py-16 sm:p-20 text-center shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ec4899_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold tracking-tight text-white">Ready to complete your collection?</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-neutral-300">
              Browse our live inventory and find the latest photocards and custom keychains.
            </p>
            <div className="mt-8 flex items-center justify-center gap-x-6">
              <Link href="/shop">
                <Button size="lg" className="bg-pink-500 text-white hover:bg-pink-600 focus:ring-pink-500 border-0 cursor-pointer">
                  Explore the Shop
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}