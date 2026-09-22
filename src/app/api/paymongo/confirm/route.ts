import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { finalizePaidOrder } from "@/lib/orders/finalizePaidOrder";

export async function GET(
  request: NextRequest
) {
  try {
    const reference =
      request.nextUrl.searchParams.get(
        "reference"
      );

    if (!reference) {
      return NextResponse.json(
        {
          error:
            "Missing order reference.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Verify logged-in customer.
     */
    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }

    const admin =
      createAdminClient();

    /*
     * Verify this order belongs
     * to the current user.
     */
    const {
      data: order,
      error: orderError,
    } =
      await admin
        .from("orders")
        .select(
          `
            id,
            order_number,
            user_id,
            payment_status,
            order_status,
            total
          `
        )
        .eq(
          "order_number",
          reference
        )
        .eq(
          "user_id",
          user.id
        )
        .single();

    if (
      orderError ||
      !order
    ) {
      return NextResponse.json(
        {
          error:
            "Order not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Already confirmed.
     */
    if (
      order.payment_status ===
      "paid"
    ) {
      const {
        data: items,
      } =
        await admin
          .from(
            "order_items"
          )
          .select(
            "product_id"
          )
          .eq(
            "order_id",
            order.id
          );

      return NextResponse.json({
        paid: true,
        order,
        productIds:
          (
            items ?? []
          )
            .map(
              (item) =>
                item.product_id
            )
            .filter(Boolean),
      });
    }

    /*
     * Get Checkout Session ID.
     */
    const {
      data: payment,
      error:
        paymentError,
    } =
      await admin
        .from(
          "payments"
        )
        .select(
          `
            transaction_id,
            status
          `
        )
        .eq(
          "order_id",
          order.id
        )
        .eq(
          "provider",
          "paymongo"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle();

    if (
      paymentError ||
      !payment
        ?.transaction_id
    ) {
      return NextResponse.json({
        paid: false,
        status:
          "pending",
        order,
      });
    }

    const secretKey =
      process.env
        .PAYMONGO_SECRET_KEY;

    if (!secretKey) {
      throw new Error(
        "PAYMONGO_SECRET_KEY is missing."
      );
    }

    /*
     * Retrieve the Checkout Session
     * directly from PayMongo.
     */
    const response =
      await fetch(
        `https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(
          payment.transaction_id
        )}`,
        {
          headers: {
            Accept:
              "application/json",

            Authorization:
              `Basic ${Buffer.from(
                `${secretKey}:`
              ).toString(
                "base64"
              )}`,
          },

          cache:
            "no-store",
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "PayMongo confirmation error:",
        data
      );

      return NextResponse.json({
        paid: false,
        status:
          "pending",
        order,
      });
    }

    const attributes =
      data?.data
        ?.attributes;

    /*
     * When authenticated with a secret key,
     * Checkout Session retrieval includes
     * its payments.
     */
    const payments =
      Array.isArray(
        attributes?.payments
      )
        ? attributes.payments
        : [];

    const hasPaidPayment =
      payments.some(
        (payment: any) =>
          payment
            ?.attributes
            ?.status ===
          "paid"
      );

    const intentSucceeded =
      attributes
        ?.payment_intent
        ?.attributes
        ?.status ===
      "succeeded";

    if (
      !hasPaidPayment &&
      !intentSucceeded
    ) {
      return NextResponse.json({
        paid: false,
        status:
          "pending",
        order,
      });
    }

    /*
     * PayMongo confirms it was paid.
     */
    const result =
      await finalizePaidOrder(
        reference
      );

    return NextResponse.json({
      paid:
        result.status ===
        "paid",

      status:
        result.status,

      order:
        result.order,

      productIds:
        result.productIds,
    });
  } catch (error) {
    console.error(
      "Payment confirmation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to confirm payment.",
      },
      {
        status: 500,
      }
    );
  }
}