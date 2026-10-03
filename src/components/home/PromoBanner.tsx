import Link from "next/link";

import {
  ArrowRight,
  TicketPercent,
} from "lucide-react";

import Container from "@/components/ui/Container";
import { HomePromoSettings } from "@/types/home";

interface PromoBannerProps {
  settings: HomePromoSettings;
}

export default function PromoBanner({
  settings,
}: PromoBannerProps) {
  if (!settings.enabled) {
    return null;
  }

  return (
    <section className="bg-white py-16 sm:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-[32px] bg-pink-500 px-6 py-10 text-white shadow-xl shadow-pink-500/10 sm:px-10 lg:px-14 lg:py-14">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/15 blur-2xl"
          />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-pink-100">
                <TicketPercent className="h-4 w-4" />

                {settings.eyebrow}
              </div>

              <h2 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                {settings.title}
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-pink-50 sm:text-base">
                {settings.description}
              </p>

              {settings.code && (
                <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                  <span className="text-xs font-medium text-pink-100">
                    Use code
                  </span>

                  <span className="font-mono text-sm font-black tracking-wider text-white">
                    {settings.code}
                  </span>
                </div>
              )}
            </div>

            <Link
              href={
                settings.buttonHref
              }
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-pink-600 transition-all hover:-translate-y-0.5 hover:bg-pink-50"
            >
              {
                settings.buttonLabel
              }

              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}