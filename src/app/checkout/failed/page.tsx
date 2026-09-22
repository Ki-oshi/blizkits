"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import {
  AlertCircle,
  Copy,
  RefreshCcw,
  ShoppingBag,
} from "lucide-react";

import Container from "@/components/ui/Container";

export default function CheckoutFailedPage() {
  const searchParams = useSearchParams();

  const reference =
    searchParams.get("reference") ?? "N/A";

  const [copied, setCopied] =
    useState(false);

  const copyReference = async () => {
    if (
      !reference ||
      reference === "N/A"
    ) {
      return;
    }

    await navigator.clipboard.writeText(
      reference
    );

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-white px-4 py-16">
      <Container className="max-w-xl">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-red-200 bg-red-50 text-red-600">
            <AlertCircle className="h-10 w-10" />
          </div>

          {/* Heading */}
          <h1 className="mt-7 text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl">
            Payment Not Completed
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-500">
            Your payment was not completed.
            No order should be considered paid
            until payment confirmation is received.
          </p>

          {/* Reference */}
          {reference !== "N/A" && (
            <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Checkout Reference
              </p>

              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="min-w-0 break-all font-mono text-sm font-bold text-neutral-900">
                  {reference}
                </p>

                <button
                  type="button"
                  onClick={copyReference}
                  className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-pink-300 hover:text-pink-500"
                >
                  <Copy className="h-3.5 w-3.5" />

                  {copied
                    ? "Copied"
                    : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-800">
              Your cart has not been cleared
            </p>

            <p className="mt-1 text-xs leading-5 text-red-700">
              You can return to checkout and try
              again using the same or a different
              payment method.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/checkout"
              className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full bg-pink-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-pink-600"
            >
              <RefreshCcw className="h-4 w-4" />

              Try Again
            </Link>

            <Link
              href="/shop"
              className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-bold text-neutral-900 transition hover:bg-neutral-50"
            >
              <ShoppingBag className="h-4 w-4" />

              Return to Shop
            </Link>
          </div>

          <p className="mx-auto mt-7 max-w-md text-[11px] leading-5 text-neutral-400">
            If money was deducted but this page
            appeared, check your payment activity
            before attempting another payment.
          </p>
        </div>
      </Container>
    </div>
  );
}