import Link from "next/link";

import {
  ArrowUpRight,
} from "lucide-react";

import Container from "@/components/ui/Container";
import { HomeCategoriesSettings } from "@/types/home";

export interface HomeCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface CategoryShowcaseProps {
  categories: HomeCategory[];
  settings: HomeCategoriesSettings;
}

export default function CategoryShowcase({
  categories,
  settings,
}: CategoryShowcaseProps) {
  if (
    !settings.enabled ||
    categories.length === 0
  ) {
    return null;
  }

  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24">
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
            {settings.title}
          </h2>

          <p className="mt-3 text-sm leading-6 text-neutral-500 sm:text-base">
            {settings.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(
            (category, index) => (
              <Link
                key={category.id}
                href={`/shop?category=${encodeURIComponent(
                  category.slug
                )}`}
                className="group relative min-h-64 overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-pink-200 hover:bg-pink-50/30 hover:shadow-xl hover:shadow-neutral-900/5 sm:p-8"
              >
                {/* Decorative number */}
                <div className="absolute right-6 top-5 text-6xl font-black tracking-tighter text-neutral-200/60 transition-colors group-hover:text-pink-100">
                  {String(index + 1).padStart(
                    2,
                    "0"
                  )}
                </div>

                <div className="relative flex h-full flex-col justify-end">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-pink-500">
                    Collection
                  </p>

                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-neutral-950 transition-colors group-hover:text-pink-600">
                        {category.name}
                      </h3>

                      {category.description && (
                        <p className="mt-2 line-clamp-2 max-w-sm text-sm leading-6 text-neutral-500">
                          {
                            category.description
                          }
                        </p>
                      )}
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-800 transition-all group-hover:border-pink-500 group-hover:bg-pink-500 group-hover:text-white">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          )}
        </div>
      </Container>
    </section>
  );
}