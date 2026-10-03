"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Clock3,
  Timer,
} from "lucide-react";

import Container from "@/components/ui/Container";
import ProductGrid from "@/components/product/ProductGrid";

import { Product } from "@/types/product";

interface LimitedDropProps {
  products: Product[];
  eyebrow: string;
  title: string;
  subtitle: string;
  endsAt: string;
  initialRemainingMs: number;
}

interface CountdownValues {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function splitTime(
  milliseconds: number
): CountdownValues {
  const totalSeconds = Math.max(
    0,
    Math.floor(milliseconds / 1000)
  );

  const days = Math.floor(
    totalSeconds / 86400
  );

  const hours = Math.floor(
    (totalSeconds % 86400) / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds =
    totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
  };
}

function CountdownBox({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="min-w-[64px] rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-center backdrop-blur sm:min-w-[76px] sm:px-4">
      <div className="text-xl font-black tabular-nums text-white sm:text-2xl">
        {String(value).padStart(
          2,
          "0"
        )}
      </div>

      <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </div>
    </div>
  );
}

export default function LimitedDrop({
  products,
  eyebrow,
  title,
  subtitle,
  endsAt,
  initialRemainingMs,
}: LimitedDropProps) {
  const [
    remainingMs,
    setRemainingMs,
  ] = useState(
    Math.max(
      0,
      initialRemainingMs
    )
  );

  useEffect(() => {
    const endTime =
      new Date(
        endsAt
      ).getTime();

    function updateCountdown() {
      setRemainingMs(
        Math.max(
          0,
          endTime -
            Date.now()
        )
      );
    }

    updateCountdown();

    const interval =
      window.setInterval(
        updateCountdown,
        1000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [endsAt]);

  const countdown =
    useMemo(
      () =>
        splitTime(
          remainingMs
        ),
      [remainingMs]
    );

  const formattedEndDate =
    useMemo(() => {
      const date =
        new Date(endsAt);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "";
      }

      return new Intl.DateTimeFormat(
        "en-PH",
        {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone:
            "Asia/Manila",
        }
      ).format(date);
    }, [endsAt]);

  /*
   * Real-time expiry.
   *
   * Once the timer reaches zero,
   * remove the entire section from
   * the current page without requiring
   * a refresh.
   */
  if (remainingMs <= 0) {
    return null;
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden bg-neutral-950 py-16 sm:py-20 lg:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-neutral-900 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
          {/* Background Decoration */}
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-pink-500/20 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-pink-400/10 blur-3xl"
          />

          {/* Heading */}
          <div className="relative mb-8 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-pink-400">
                <Timer className="h-4 w-4" />

                {eyebrow}
              </div>

              <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                {title}
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-400 sm:text-base">
                {subtitle}
              </p>

              {formattedEndDate && (
                <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
                  <Clock3 className="h-4 w-4" />

                  Ends{" "}
                  {
                    formattedEndDate
                  }{" "}
                  PHT
                </div>
              )}
            </div>

            {/* Countdown */}
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                Drop ends in
              </p>

              <div className="flex flex-wrap gap-2">
                <CountdownBox
                  value={
                    countdown.days
                  }
                  label="Days"
                />

                <CountdownBox
                  value={
                    countdown.hours
                  }
                  label="Hours"
                />

                <CountdownBox
                  value={
                    countdown.minutes
                  }
                  label="Mins"
                />

                <CountdownBox
                  value={
                    countdown.seconds
                  }
                  label="Secs"
                />
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="relative rounded-3xl bg-white p-4 sm:p-6 lg:p-8">
            <ProductGrid
              products={
                products
              }
              emptyMessage="No limited items are available right now."
            />
          </div>
        </div>
      </Container>
    </section>
  );
}