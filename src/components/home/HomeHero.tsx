import Link from "next/link";

import {
  ArrowRight,
  Disc,
} from "lucide-react";

import Container from "@/components/ui/Container";
import { HomeHeroSettings } from "@/types/home";

interface HomeHeroProps {
  settings: HomeHeroSettings;
}

export default function HomeHero({
  settings,
}: HomeHeroProps) {
  if (!settings.enabled) {
    return null;
  }

  return (
    <section className="relative overflow-hidden bg-neutral-950">
      {/* Decorative Background */}
      <div
        aria-hidden="true"
        className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-pink-500/20 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="absolute -bottom-40 right-0 h-[420px] w-[420px] rounded-full bg-pink-400/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px]"
      />

      <Container className="relative z-10">
        <div className="mx-auto flex min-h-[570px] max-w-4xl flex-col items-center justify-center py-24 text-center sm:min-h-[620px] sm:py-32">
          {/* Eyebrow */}
          {settings.eyebrow && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/10 px-4 py-2 text-xs font-semibold text-pink-300">
              <Disc className="h-3.5 w-3.5" />

              <span>
                {settings.eyebrow}
              </span>
            </div>
          )}

          {/* Heading */}
          <h1 className="max-w-4xl text-4xl font-black leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl md:text-6xl lg:text-7xl">
            {settings.title}
          </h1>

          {/* Description */}
          <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-300 sm:text-lg sm:leading-8">
            {settings.description}
          </p>

          {/* Actions */}
          <div className="mt-9 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
            <Link
              href={settings.primaryHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-pink-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition-all hover:-translate-y-0.5 hover:bg-pink-600"
            >
              {settings.primaryLabel}

              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href={settings.secondaryHref}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-neutral-700 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:border-neutral-500 hover:bg-white/10"
            >
              {settings.secondaryLabel}
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}