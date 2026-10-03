import Link from "next/link";

import { ArrowRight } from "lucide-react";

import Container from "@/components/ui/Container";
import ProductGrid from "@/components/product/ProductGrid";

import { Product } from "@/types/product";

interface ProductSectionProps {
  products: Product[];
  eyebrow?: string;
  title: string;
  subtitle: string;
  enabled?: boolean;
  emptyMessage?: string;
  background?: "white" | "muted";
}

export default function ProductSection({
  products,
  eyebrow,
  title,
  subtitle,
  enabled = true,
  emptyMessage = "No products available right now.",
  background = "white",
}: ProductSectionProps) {
  if (!enabled) {
    return null;
  }

  return (
    <section
      className={
        background === "muted"
          ? "bg-neutral-50/70 py-16 sm:py-20 lg:py-24"
          : "bg-white py-16 sm:py-20 lg:py-24"
      }
    >
      <Container>
        <div className="mb-10 flex flex-col gap-5 border-b border-neutral-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {eyebrow && (
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-pink-500">
                {eyebrow}
              </p>
            )}

            <h2 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
              {title}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              {subtitle}
            </p>
          </div>

          <Link
            href="/shop"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-neutral-700 transition-colors hover:text-pink-500"
          >
            View all

            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ProductGrid
          products={products}
          emptyMessage={emptyMessage}
        />
      </Container>
    </section>
  );
}