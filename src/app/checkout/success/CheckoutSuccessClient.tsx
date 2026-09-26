"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  CheckCircle2,
  Loader2,
  Package,
  ShoppingBag,
  TriangleAlert,
} from "lucide-react";

import Container from "@/components/ui/Container";

import { useCart } from "@/context/CartContext";

interface Props {
  reference: string;
}

type Status =
  | "checking"
  | "paid"
  | "pending"
  | "error";

interface ConfirmationResponse {
  paid?: boolean;

  status?: string;

  error?: string;

  reason?: string;

  order?: {
    order_number?: string;
  };

  productIds?: string[];
}

interface ConfirmationRequestResult {
  ok: boolean;
  status: number;
  data: ConfirmationResponse;
}

/*
 * Prevent multiple mounted effects from making the exact
 * same confirmation request at the same time.
 *
 * This is especially useful during development where React
 * may intentionally run effects more than once.
 */
const confirmationRequests =
  new Map<
    string,
    Promise<ConfirmationRequestResult>
  >();

async function requestPaymentConfirmation(
  reference: string
): Promise<ConfirmationRequestResult> {
  const existingRequest =
    confirmationRequests.get(reference);

  if (existingRequest) {
    return existingRequest;
  }

  const request =
    fetch(
      `/api/paymongo/confirm?reference=${encodeURIComponent(
        reference
      )}`,
      {
        cache: "no-store",
      }
    )
      .then(async (response) => {
        let data: ConfirmationResponse =
          {};

        try {
          data =
            await response.json();
        } catch {
          data = {};
        }

        return {
          ok: response.ok,
          status: response.status,
          data,
        };
      })
      .finally(() => {
        confirmationRequests.delete(
          reference
        );
      });

  confirmationRequests.set(
    reference,
    request
  );

  return request;
}

export default function CheckoutSuccessClient({
  reference,
}: Props) {
  const {
    removeFromCart,
  } = useCart();

  const [
    status,
    setStatus,
  ] =
    useState<Status>(
      "checking"
    );

  const [
    orderNumber,
    setOrderNumber,
  ] =
    useState(reference);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  /*
   * Keep the latest removeFromCart function without making
   * the payment confirmation effect depend on its function
   * identity.
   */
  const removeFromCartRef =
    useRef(removeFromCart);

  /*
   * Prevent the same successful checkout from clearing its
   * products from the cart more than once.
   */
  const cleared =
    useRef(false);

  useEffect(() => {
    removeFromCartRef.current =
      removeFromCart;
  }, [
    removeFromCart,
  ]);

  useEffect(() => {
    let cancelled =
      false;

    let attempt =
      0;

    let retryTimer:
      ReturnType<typeof setTimeout> |
      null =
      null;

    /*
     * Reset UI when navigating to a different checkout
     * reference without requiring a full page reload.
     */
    setStatus(
      "checking"
    );

    setError(
      null
    );

    setOrderNumber(
      reference
    );

    cleared.current =
      false;

    async function confirmPayment() {
      try {
        const {
          ok,
          data,
        } =
          await requestPaymentConfirmation(
            reference
          );

        if (cancelled) {
          return;
        }

        if (!ok) {
          throw new Error(
            data.error ||
              "Unable to confirm your payment."
          );
        }

        if (
          data.order
            ?.order_number
        ) {
          setOrderNumber(
            data.order
              .order_number
          );
        }

        if (data.paid) {
          /*
           * Remove only the products that belonged to this
           * successful order.
           *
           * Use the ref instead of placing removeFromCart in
           * the main confirmation effect dependency array.
           */
          if (
            !cleared.current &&
            Array.isArray(
              data.productIds
            )
          ) {
            cleared.current =
              true;

            for (
              const productId of
              data.productIds
            ) {
              removeFromCartRef
                .current(
                  productId
                );
            }
          }

          setStatus(
            "paid"
          );

          return;
        }

        /*
         * PayMongo/webhook synchronization may take a moment.
         *
         * Retry sequentially instead of starting overlapping
         * confirmation requests.
         */
        attempt += 1;

        if (
          attempt < 10
        ) {
          retryTimer =
            setTimeout(
              () => {
                void confirmPayment();
              },
              2000
            );

          return;
        }

        setStatus(
          "pending"
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to verify payment."
        );

        setStatus(
          "error"
        );
      }
    }

    void confirmPayment();

    return () => {
      cancelled =
        true;

      if (retryTimer) {
        clearTimeout(
          retryTimer
        );
      }
    };
  }, [
    reference,
  ]);

  /*
   * =========================================
   * CHECKING
   * =========================================
   */

  if (
    status ===
    "checking"
  ) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-white px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-pink-500" />

          <h1 className="mt-5 text-2xl font-black text-neutral-900">
            Confirming Payment
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Please wait while we
            verify your transaction
            with PayMongo.
          </p>
        </div>
      </div>
    );
  }

  /*
   * =========================================
   * PAID
   * =========================================
   */

  if (
    status ===
    "paid"
  ) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-white px-4 py-16">
        <Container className="max-w-xl">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-200 bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <h1 className="mt-7 text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl">
              Payment Confirmed
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-500">
              Your payment was
              successfully confirmed.
              Your order is now being
              prepared for processing.
            </p>

            <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Order Number
              </p>

              <p className="mt-2 break-all font-mono text-sm font-bold text-neutral-900">
                {orderNumber}
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/account?tab=purchases"
                className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full bg-pink-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-pink-600"
              >
                <Package className="h-4 w-4" />

                View My Purchases
              </Link>

              <Link
                href="/shop"
                className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-bold text-neutral-900 transition hover:bg-neutral-50"
              >
                <ShoppingBag className="h-4 w-4" />

                Continue Shopping
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  /*
   * =========================================
   * STILL PENDING
   * =========================================
   */

  if (
    status ===
    "pending"
  ) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-white px-4">
        <Container className="max-w-lg text-center">
          <Loader2 className="mx-auto h-10 w-10 text-amber-500" />

          <h1 className="mt-6 text-3xl font-black text-neutral-900">
            Payment Is Being Confirmed
          </h1>

          <p className="mt-3 text-sm leading-6 text-neutral-500">
            We received your return
            from PayMongo, but the
            payment confirmation is
            still processing.
          </p>

          <Link
            href="/account?tab=purchases"
            className="mt-7 inline-flex rounded-full bg-pink-500 px-6 py-3 text-sm font-bold text-white"
          >
            View My Purchases
          </Link>
        </Container>
      </div>
    );
  }

  /*
   * =========================================
   * ERROR
   * =========================================
   */

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-white px-4">
      <Container className="max-w-lg text-center">
        <TriangleAlert className="mx-auto h-12 w-12 text-red-500" />

        <h1 className="mt-6 text-3xl font-black text-neutral-900">
          Unable to Confirm Payment
        </h1>

        <p className="mt-3 text-sm leading-6 text-neutral-500">
          {error}
        </p>

        <p className="mt-4 text-xs text-neutral-400">
          Do not submit another
          payment until you verify
          your order status.
        </p>

        <Link
          href="/account?tab=purchases"
          className="mt-7 inline-flex rounded-full bg-pink-500 px-6 py-3 text-sm font-bold text-white"
        >
          Check My Purchases
        </Link>
      </Container>
    </div>
  );
}