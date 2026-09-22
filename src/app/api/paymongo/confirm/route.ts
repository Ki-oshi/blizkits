import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  finalizePaidOrder,
} from "@/lib/orders/finalizePaidOrder";

export async function GET(
  request: NextRequest
) {
  /*
   * Track which stage fails.
   *
   * This is safe to return because
   * it contains no credentials.
   */
  let stage =
    "initialization";

  try {
    /* =====================================================
       ORDER REFERENCE
    ===================================================== */

    stage =
      "reading_reference";

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

    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    stage =
      "authenticating_user";

    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
      error:
        authError,
    } =
      await supabase.auth.getUser();

    if (authError) {
      console.error(
        "Payment confirmation auth error:",
        authError
      );
    }

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

    /* =====================================================
       ADMIN CLIENT
    ===================================================== */

    stage =
      "creating_admin_client";

    const admin =
      createAdminClient();

    /* =====================================================
       FIND ORDER
    ===================================================== */

    stage =
      "finding_order";

    const {
      data: order,
      error:
        orderError,
    } =
      await admin
        .from(
          "orders"
        )
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
        .maybeSingle();

    if (orderError) {
      console.error(
        "Order lookup error:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Unable to retrieve order.",

          debug:
            orderError.message,

          stage,
        },
        {
          status: 500,
        }
      );
    }

    if (!order) {
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

    /* =====================================================
       ALREADY PAID
    ===================================================== */

    if (
      order.payment_status ===
      "paid"
    ) {
      stage =
        "loading_paid_order_items";

      const {
        data: items,
        error:
          itemsError,
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

      if (itemsError) {
        console.error(
          "Paid order item lookup error:",
          itemsError
        );
      }

      return NextResponse.json({
        paid: true,

        status:
          "paid",

        order,

        productIds:
          (
            items ??
            []
          )
            .map(
              (
                item
              ) =>
                item.product_id
            )
            .filter(
              Boolean
            ),
      });
    }

    /* =====================================================
       FIND PAYMONGO PAYMENT RECORD
    ===================================================== */

    stage =
      "finding_payment_record";

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
        .limit(
          1
        )
        .maybeSingle();

    if (paymentError) {
      console.error(
        "Payment record lookup error:",
        paymentError
      );

      return NextResponse.json(
        {
          error:
            "Unable to retrieve payment record.",

          debug:
            paymentError.message,

          stage,
        },
        {
          status: 500,
        }
      );
    }

    if (
      !payment
        ?.transaction_id
    ) {
      return NextResponse.json({
        paid: false,

        status:
          "pending",

        reason:
          "No PayMongo checkout session was found for this order.",

        order,
      });
    }

    /* =====================================================
       PAYMONGO SECRET
    ===================================================== */

    stage =
      "checking_paymongo_configuration";

    const secretKey =
      process.env
        .PAYMONGO_SECRET_KEY;

    if (!secretKey) {
      throw new Error(
        "PAYMONGO_SECRET_KEY is missing."
      );
    }

    /* =====================================================
       RETRIEVE CHECKOUT SESSION
    ===================================================== */

    stage =
      "retrieving_paymongo_checkout_session";

    const response =
      await fetch(
        `https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(
          payment.transaction_id
        )}`,
        {
          method:
            "GET",

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

    /*
     * Read as text first.
     *
     * This prevents response.json()
     * from throwing if PayMongo ever
     * returns an empty/non-JSON body.
     */
    const rawBody =
      await response.text();

    let data:
      any =
      null;

    if (
      rawBody
    ) {
      try {
        data =
          JSON.parse(
            rawBody
          );
      } catch {
        console.error(
          "PayMongo returned non-JSON response:",
          rawBody
        );

        return NextResponse.json(
          {
            error:
              "PayMongo returned an invalid response.",

            debug:
              `HTTP ${response.status}`,

            stage,
          },
          {
            status:
              502,
          }
        );
      }
    }

    if (
      !response.ok
    ) {
      console.error(
        "PayMongo checkout session retrieval failed:",
        {
          status:
            response.status,

          statusText:
            response.statusText,

          data,
        }
      );

      return NextResponse.json(
        {
          error:
            "Unable to retrieve PayMongo checkout session.",

          debug:
            data?.errors?.[0]
              ?.detail ??
            data?.errors?.[0]
              ?.code ??
            `PayMongo returned HTTP ${response.status}`,

          stage,
        },
        {
          status:
            502,
        }
      );
    }

    /* =====================================================
       CHECK PAYMONGO PAYMENT STATUS
    ===================================================== */

    stage =
      "checking_paymongo_payment_status";

    const attributes =
      data?.data
        ?.attributes;

    const payments =
      Array.isArray(
        attributes
          ?.payments
      )
        ? attributes
            .payments
        : [];

    /*
     * PayMongo payment objects
     * normally expose:
     *
     * payment.attributes.status
     */
    const hasPaidPayment =
      payments.some(
        (
          paymongoPayment:
            any
        ) =>
          paymongoPayment
            ?.attributes
            ?.status ===
          "paid"
      );

    /*
     * Keep payment_intent as an
     * additional fallback signal.
     */
    const intentStatus =
      attributes
        ?.payment_intent
        ?.attributes
        ?.status;

    const intentSucceeded =
      intentStatus ===
      "succeeded";

    console.log(
      "PayMongo confirmation status:",
      {
        reference,

        checkoutSessionId:
          payment
            .transaction_id,

        checkoutSessionStatus:
          attributes
            ?.status ??
          null,

        paymentsCount:
          payments.length,

        paymentStatuses:
          payments.map(
            (
              paymongoPayment:
                any
            ) =>
              paymongoPayment
                ?.attributes
                ?.status ??
              null
          ),

        paymentIntentStatus:
          intentStatus ??
          null,

        hasPaidPayment,

        intentSucceeded,
      }
    );

    if (
      !hasPaidPayment &&
      !intentSucceeded
    ) {
      return NextResponse.json({
        paid: false,

        status:
          "pending",

        reason:
          "PayMongo has not reported this checkout session as paid yet.",

        paymongo: {
          checkoutStatus:
            attributes
              ?.status ??
            null,

          paymentStatuses:
            payments.map(
              (
                paymongoPayment:
                  any
              ) =>
                paymongoPayment
                  ?.attributes
                  ?.status ??
                null
            ),

          paymentIntentStatus:
            intentStatus ??
            null,
        },

        order,
      });
    }

    /* =====================================================
       FINALIZE ORDER
    ===================================================== */

    stage =
      "finalizing_paid_order";

    console.log(
      "Finalizing paid order:",
      reference
    );

    const result =
      await finalizePaidOrder(
        reference
      );

    console.log(
      "Paid order finalization result:",
      {
        reference,

        status:
          result.status,

        productIds:
          result.productIds,
      }
    );

    /* =====================================================
       SUCCESS
    ===================================================== */

    stage =
      "complete";

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
  } catch (
    error
  ) {
    const message =
      error instanceof
      Error
        ? error.message
        : String(
            error
          );

    console.error(
      "Payment confirmation error:",
      {
        stage,
        message,
        error,
      }
    );

    /*
     * TEMPORARY DEBUG OUTPUT
     *
     * Remove `debug` and `stage`
     * after payment confirmation
     * is working.
     */
    return NextResponse.json(
      {
        error:
          "Unable to confirm payment.",

        debug:
          message,

        stage,
      },
      {
        status: 500,
      }
    );
  }
}