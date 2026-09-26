import {
  NextResponse,
} from "next/server";

import {
  sendOrderCancelledEmail,
} from "@/lib/email/sendOrderLifecycleEmail";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

const ALLOWED_REASONS =
  new Set([
    "changed_mind",
    "ordered_by_mistake",
    "wrong_item",
    "change_delivery_details",
    "found_alternative",
    "other",
  ]);

const CANCELLABLE_ORDER_STATUSES =
  new Set([
    "pending",
    "processing",
  ]);

const ORDER_SELECT = `
  id,
  order_number,
  user_id,
  customer_email,
  subtotal,
  shipping_fee,
  total,
  payment_status,
  order_status,
  cancellation_status,
  cancel_reason,
  cancel_notes,
  cancel_requested_at,
  cancelled_at,
  refund_status,
  refund_id,
  refund_amount,
  refunded_at,
  stock_restored_at,
  paid_finalized_at,
  created_at
`;

interface CancelOrderRequest {
  reason?: string;
  notes?: string;
}

interface RouteContext {
  params:
    Promise<{
      orderId:
        string;
    }>;
}

interface PayMongoRefundResource {
  id?: string;

  attributes?: {
    amount?:
      number;

    payment_id?:
      string;

    status?:
      string;

    created_at?:
      number;

    updated_at?:
      number;
  };
}

function normalizeStatus(
  value:
    unknown
) {
  return String(
    value ??
      ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /[\s-]+/g,
      "_"
    );
}

function getErrorMessage(
  error:
    unknown
) {
  if (
    error instanceof
    Error
  ) {
    return error.message;
  }

  if (
    typeof error ===
    "string"
  ) {
    return error;
  }

  if (
    error &&
    typeof error ===
      "object"
  ) {
    const value =
      error as Record<
        string,
        unknown
      >;

    const parts = [
      value.message,
      value.details,
      value.hint,
      value.code,
    ]
      .filter(
        Boolean
      )
      .map(
        String
      );

    if (
      parts.length >
      0
    ) {
      return parts.join(
        " | "
      );
    }

    try {
      return JSON.stringify(
        error
      );
    } catch {
      return "Unknown error.";
    }
  }

  return String(
    error
  );
}

function getPayMongoErrorMessage(
  payload:
    any
) {
  const firstError =
    payload?.errors?.[0];

  return (
    firstError?.detail ??
    firstError?.code ??
    payload?.error ??
    "PayMongo was unable to process the refund."
  );
}

function toIsoFromUnix(
  value:
    unknown
) {
  const seconds =
    Number(
      value
    );

  if (
    !Number.isFinite(
      seconds
    ) ||
    seconds <=
      0
  ) {
    return null;
  }

  return new Date(
    seconds *
      1000
  ).toISOString();
}

function getPayMongoAuthorization(
  secretKey:
    string
) {
  return `Basic ${Buffer.from(
    `${secretKey}:`
  ).toString(
    "base64"
  )}`;
}

async function sendCancellationEmailSafely(
  order:
    any
) {
  try {
    const result =
      await sendOrderCancelledEmail({
        orderId:
          order.id,

        orderNumber:
          order.order_number,

        userId:
          order.user_id,

        total:
          order.total,

        reason:
          order.cancel_reason,

        refundStatus:
          order.refund_status,

        refundAmount:
          order.refund_amount,
      });

    if (
      !result.sent
    ) {
      console.info(
        "Cancellation email skipped:",
        {
          orderId:
            order.id,

          reason:
            result.reason,
        }
      );
    }
  } catch (
    error
  ) {
    console.error(
      "Unable to send cancellation email:",
      getErrorMessage(
        error
      )
    );
  }
}

export async function POST(
  request:
    Request,

  context:
    RouteContext
) {
  const {
    orderId,
  } =
    await context.params;

  try {
    const supabase =
      await createClient();

    const admin =
      createAdminClient();

    const {
      data: {
        user,
      },

      error:
        authError,
    } =
      await supabase.auth
        .getUser();

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "You must be signed in to cancel an order.",
        },
        {
          status:
            401,
        }
      );
    }

    let body:
      CancelOrderRequest;

    try {
      body =
        (await request.json()) as
          CancelOrderRequest;
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid cancellation request.",
        },
        {
          status:
            400,
        }
      );
    }

    const reason =
      String(
        body.reason ??
          ""
      )
        .trim()
        .toLowerCase();

    const notes =
      String(
        body.notes ??
          ""
      )
        .trim()
        .slice(
          0,
          500
        );

    if (
      !ALLOWED_REASONS.has(
        reason
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Please select a valid cancellation reason.",
        },
        {
          status:
            400,
        }
      );
    }

    const {
      data:
        order,

      error:
        orderError,
    } =
      await admin
        .from(
          "orders"
        )
        .select(
          ORDER_SELECT
        )
        .eq(
          "id",
          orderId
        )
        .maybeSingle();

    if (
      orderError
    ) {
      console.error(
        "Cancel order lookup error:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load this order.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !order
    ) {
      return NextResponse.json(
        {
          error:
            "Order not found.",
        },
        {
          status:
            404,
        }
      );
    }

    if (
      order.user_id !==
      user.id
    ) {
      return NextResponse.json(
        {
          error:
            "You are not allowed to cancel this order.",
        },
        {
          status:
            403,
        }
      );
    }

    const orderStatus =
      normalizeStatus(
        order.order_status
      );

    const paymentStatus =
      normalizeStatus(
        order.payment_status
      );

    const cancellationStatus =
      normalizeStatus(
        order.cancellation_status
      );

    if (
      orderStatus ===
        "cancelled" ||
      cancellationStatus ===
        "cancelled"
    ) {
      return NextResponse.json({
        success:
          true,

        alreadyCancelled:
          true,

        order,
      });
    }

    if (
      cancellationStatus ===
      "processing"
    ) {
      return NextResponse.json(
        {
          success:
            true,

          processing:
            true,

          message:
            "This cancellation is already being processed.",

          order,
        },
        {
          status:
            202,
        }
      );
    }

    if (
      cancellationStatus ===
        "refund_failed" ||
      normalizeStatus(
        order.refund_status
      ) ===
        "failed"
    ) {
      return NextResponse.json(
        {
          error:
            "A previous refund attempt failed. Please wait for refund reconciliation before trying again.",

          order,
        },
        {
          status:
            409,
        }
      );
    }

    if (
      !CANCELLABLE_ORDER_STATUSES.has(
        orderStatus
      )
    ) {
      return NextResponse.json(
        {
          error:
            orderStatus ===
                "shipped" ||
              orderStatus ===
                "delivered"
              ? "This order can no longer be cancelled because fulfillment has already progressed."
              : "This order is not eligible for cancellation.",
        },
        {
          status:
            409,
        }
      );
    }

    /*
     * =========================================
     * UNPAID ORDER
     * =========================================
     */

    if (
      paymentStatus !==
        "paid" &&
      paymentStatus !==
        "refunded"
    ) {
      const now =
        new Date()
          .toISOString();

      const {
        data:
          cancelledOrder,

        error:
          cancelError,
      } =
        await admin
          .from(
            "orders"
          )
          .update({
            order_status:
              "cancelled",

            cancellation_status:
              "cancelled",

            cancel_reason:
              reason,

            cancel_notes:
              notes ||
              null,

            cancel_requested_at:
              now,

            cancelled_at:
              now,

            refund_status:
              "not_required",

            refund_id:
              null,

            refund_amount:
              null,

            refunded_at:
              null,
          })
          .eq(
            "id",
            order.id
          )
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "order_status",
            order.order_status
          )
          .select(
            ORDER_SELECT
          )
          .maybeSingle();

      if (
        cancelError
      ) {
        console.error(
          "Unable to cancel unpaid order:",
          cancelError
        );

        return NextResponse.json(
          {
            error:
              "Unable to cancel this order.",
          },
          {
            status:
              500,
          }
        );
      }

      if (
        !cancelledOrder
      ) {
        return NextResponse.json(
          {
            error:
              "This order changed while the cancellation was being submitted. Refresh My Purchases and try again.",
          },
          {
            status:
              409,
          }
        );
      }

      await sendCancellationEmailSafely(
        cancelledOrder
      );

      return NextResponse.json({
        success:
          true,

        refunded:
          false,

        order:
          cancelledOrder,
      });
    }

    /*
     * =========================================
     * ALREADY REFUNDED
     * =========================================
     */

    if (
      paymentStatus ===
      "refunded"
    ) {
      const now =
        new Date()
          .toISOString();

      const {
        data:
          cancelledOrder,

        error:
          cancelledOrderError,
      } =
        await admin
          .from(
            "orders"
          )
          .update({
            order_status:
              "cancelled",

            cancellation_status:
              "cancelled",

            cancel_reason:
              order.cancel_reason ??
              reason,

            cancel_notes:
              (
                order.cancel_notes ??
                notes
              ) ||
              null,

            cancel_requested_at:
              order.cancel_requested_at ??
              now,

            cancelled_at:
              order.cancelled_at ??
              now,
          })
          .eq(
            "id",
            order.id
          )
          .select(
            ORDER_SELECT
          )
          .maybeSingle();

      if (
        cancelledOrderError ||
        !cancelledOrder
      ) {
        console.error(
          "Unable to finish already-refunded cancellation:",
          cancelledOrderError
        );

        return NextResponse.json(
          {
            error:
              "The payment is already refunded, but the order could not be marked cancelled.",
          },
          {
            status:
              500,
          }
        );
      }

      const {
        error:
          stockRestoreError,
      } =
        await admin.rpc(
          "restore_order_stock_for_cancellation",
          {
            p_order_id:
              order.id,
          }
        );

      if (
        stockRestoreError
      ) {
        console.error(
          "Unable to restore stock for already-refunded order:",
          stockRestoreError
        );
      }

      await sendCancellationEmailSafely(
        cancelledOrder
      );

      return NextResponse.json({
        success:
          true,

        refunded:
          true,

        order:
          cancelledOrder,
      });
    }

    /*
     * =========================================
     * PAID ORDER
     * =========================================
     */

    const secretKey =
      process.env
        .PAYMONGO_SECRET_KEY;

    if (
      !secretKey
    ) {
      return NextResponse.json(
        {
          error:
            "Refund processing is not configured.",
        },
        {
          status:
            500,
        }
      );
    }

    const {
      data:
        payment,

      error:
        paymentError,
    } =
      await admin
        .from(
          "payments"
        )
        .select(
          `
            id,
            order_id,
            provider,
            transaction_id,
            checkout_session_id,
            paymongo_payment_id,
            external_reference_number,
            amount,
            status,
            payment_method,
            paid_at,
            created_at
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

    if (
      paymentError
    ) {
      console.error(
        "Unable to load PayMongo payment:",
        paymentError
      );

      return NextResponse.json(
        {
          error:
            "Unable to locate the payment for this order.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !payment
    ) {
      return NextResponse.json(
        {
          error:
            "No PayMongo payment record was found for this order.",
        },
        {
          status:
            409,
        }
      );
    }

    let paymongoPaymentId =
      payment
        .paymongo_payment_id
        ? String(
            payment
              .paymongo_payment_id
          )
        : "";

    if (
      !paymongoPaymentId
    ) {
      const checkoutSessionId =
        payment
          .checkout_session_id ||
        (
          String(
            payment
              .transaction_id ??
              ""
          ).startsWith(
            "cs_"
          )
            ? payment
                .transaction_id
            : null
        );

      if (
        !checkoutSessionId
      ) {
        return NextResponse.json(
          {
            error:
              "This order is missing its PayMongo payment reference, so an automatic refund cannot be created.",
          },
          {
            status:
              409,
          }
        );
      }

      const sessionResponse =
        await fetch(
          `https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(
            String(
              checkoutSessionId
            )
          )}`,
          {
            method:
              "GET",

            headers: {
              Accept:
                "application/json",

              Authorization:
                getPayMongoAuthorization(
                  secretKey
                ),
            },

            cache:
              "no-store",
          }
        );

      const sessionText =
        await sessionResponse
          .text();

      let sessionPayload:
        any =
        null;

      if (
        sessionText
      ) {
        try {
          sessionPayload =
            JSON.parse(
              sessionText
            );
        } catch {
          sessionPayload =
            null;
        }
      }

      if (
        !sessionResponse.ok
      ) {
        console.error(
          "Unable to retrieve PayMongo checkout session while preparing refund:",
          {
            status:
              sessionResponse.status,

            payload:
              sessionPayload,
          }
        );

        return NextResponse.json(
          {
            error:
              "Unable to retrieve the PayMongo payment for this order.",
          },
          {
            status:
              502,
          }
        );
      }

      const providerPayments =
        Array.isArray(
          sessionPayload
            ?.data
            ?.attributes
            ?.payments
        )
          ? sessionPayload
              .data
              .attributes
              .payments
          : [];

      const paidProviderPayment =
        providerPayments.find(
          (
            providerPayment:
              any
          ) =>
            providerPayment
              ?.attributes
              ?.status ===
            "paid"
        );

      paymongoPaymentId =
        String(
          paidProviderPayment
            ?.id ??
            ""
        );

      if (
        !paymongoPaymentId
      ) {
        return NextResponse.json(
          {
            error:
              "PayMongo has not exposed a refundable paid payment for this order yet.",
          },
          {
            status:
              409,
          }
        );
      }

      const {
        error:
          paymentReferenceUpdateError,
      } =
        await admin
          .from(
            "payments"
          )
          .update({
            paymongo_payment_id:
              paymongoPaymentId,
          })
          .eq(
            "id",
            payment.id
          );

      if (
        paymentReferenceUpdateError
      ) {
        console.error(
          "Unable to save recovered PayMongo payment ID:",
          paymentReferenceUpdateError
        );
      }
    }

    const paymentAmount =
      Number(
        payment.amount ??
          order.total ??
          0
      );

    if (
      !Number.isFinite(
        paymentAmount
      ) ||
      paymentAmount <=
        0
    ) {
      return NextResponse.json(
        {
          error:
            "The payment amount is invalid and cannot be refunded automatically.",
        },
        {
          status:
            500,
        }
      );
    }

    const amountInCentavos =
      Math.round(
        paymentAmount *
          100
      );

    /*
     * =========================================
     * CLAIM CANCELLATION
     * =========================================
     */

    const requestedAt =
      new Date()
        .toISOString();

    let claimQuery =
      admin
        .from(
          "orders"
        )
        .update({
          cancellation_status:
            "processing",

          cancel_reason:
            reason,

          cancel_notes:
            notes ||
            null,

          cancel_requested_at:
            requestedAt,

          refund_status:
            "processing",
        })
        .eq(
          "id",
          order.id
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "order_status",
          order.order_status
        );

    if (
      order
        .cancellation_status ==
      null
    ) {
      claimQuery =
        claimQuery.is(
          "cancellation_status",
          null
        );
    } else {
      claimQuery =
        claimQuery.eq(
          "cancellation_status",
          order
            .cancellation_status
        );
    }

    const {
      data:
        claimedOrder,

      error:
        claimError,
    } =
      await claimQuery
        .select(
          ORDER_SELECT
        )
        .maybeSingle();

    if (
      claimError
    ) {
      console.error(
        "Unable to claim cancellation:",
        claimError
      );

      return NextResponse.json(
        {
          error:
            "Unable to start the cancellation request.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !claimedOrder
    ) {
      return NextResponse.json(
        {
          error:
            "This order changed while the cancellation was being submitted. Refresh My Purchases and try again.",
        },
        {
          status:
            409,
        }
      );
    }

    const providerNotes =
      `Customer cancellation for ${claimedOrder.order_number}: ${reason}${
        notes
          ? ` - ${notes}`
          : ""
      }`.slice(
        0,
        255
      );

    let refundResponse:
      Response;

    try {
      refundResponse =
        await fetch(
          "https://api.paymongo.com/v1/refunds",
          {
            method:
              "POST",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",

              Authorization:
                getPayMongoAuthorization(
                  secretKey
                ),
            },

            body:
              JSON.stringify({
                data: {
                  attributes: {
                    amount:
                      amountInCentavos,

                    payment_id:
                      paymongoPaymentId,

                    reason:
                      "others",

                    notes:
                      providerNotes,
                  },
                },
              }),

            cache:
              "no-store",
          }
        );
    } catch (
      refundNetworkError
    ) {
      console.error(
        "PayMongo refund network error:",
        refundNetworkError
      );

      return NextResponse.json(
        {
          error:
            "The refund request could not be confirmed. The cancellation remains processing so another refund is not submitted accidentally.",

          order:
            claimedOrder,
        },
        {
          status:
            502,
        }
      );
    }

    const refundText =
      await refundResponse
        .text();

    let refundPayload:
      any =
      null;

    if (
      refundText
    ) {
      try {
        refundPayload =
          JSON.parse(
            refundText
          );
      } catch {
        refundPayload =
          null;
      }
    }

    if (
      !refundResponse.ok
    ) {
      console.error(
        "PayMongo refund creation failed:",
        {
          status:
            refundResponse.status,

          payload:
            refundPayload,
        }
      );

      if (
        refundResponse.status >=
          400 &&
        refundResponse.status <
          500
      ) {
        await admin
          .from(
            "orders"
          )
          .update({
            cancellation_status:
              "refund_failed",

            refund_status:
              "failed",
          })
          .eq(
            "id",
            claimedOrder.id
          );
      }

      return NextResponse.json(
        {
          error:
            getPayMongoErrorMessage(
              refundPayload
            ),
        },
        {
          status:
            502,
        }
      );
    }

    const refund =
      refundPayload
        ?.data as
        | PayMongoRefundResource
        | undefined;

    const refundId =
      String(
        refund?.id ??
          ""
      );

    if (
      !refundId
    ) {
      console.error(
        "PayMongo refund response did not include a refund ID:",
        refundPayload
      );

      return NextResponse.json(
        {
          error:
            "PayMongo accepted the request but returned an invalid refund response. The cancellation remains processing.",
        },
        {
          status:
            502,
        }
      );
    }

    const refundAttributes =
      refund?.attributes ??
      {};

    const providerRefundStatus =
      normalizeStatus(
        refundAttributes.status ??
          "processing"
      ) ||
      "processing";

    const providerRefundFailed =
      providerRefundStatus ===
      "failed";

    const providerRefundSucceeded =
      providerRefundStatus ===
      "succeeded";

    const refundedAmountCentavos =
      Number(
        refundAttributes.amount ??
          amountInCentavos
      );

    const refundAmount =
      Number.isFinite(
        refundedAmountCentavos
      )
        ? refundedAmountCentavos /
          100
        : paymentAmount;

    const refundedAt =
      providerRefundSucceeded
        ? toIsoFromUnix(
            refundAttributes.updated_at ??
              refundAttributes.created_at
          ) ??
          new Date()
            .toISOString()
        : null;

    if (
      providerRefundFailed
    ) {
      const {
        data:
          failedOrder,
      } =
        await admin
          .from(
            "orders"
          )
          .update({
            cancellation_status:
              "refund_failed",

            refund_status:
              "failed",

            refund_id:
              refundId,

            refund_amount:
              refundAmount,
          })
          .eq(
            "id",
            claimedOrder.id
          )
          .select(
            ORDER_SELECT
          )
          .maybeSingle();

      return NextResponse.json(
        {
          error:
            "PayMongo could not complete the refund. The order has not been cancelled.",

          order:
            failedOrder ??
            claimedOrder,
        },
        {
          status:
            409,
        }
      );
    }

    const orderPaymentStatus =
      providerRefundSucceeded
        ? "refunded"
        : "paid";

    const cancelledAt =
      new Date()
        .toISOString();

    const {
      data:
        cancelledOrder,

      error:
        cancelledOrderError,
    } =
      await admin
        .from(
          "orders"
        )
        .update({
          order_status:
            "cancelled",

          payment_status:
            orderPaymentStatus,

          cancellation_status:
            "cancelled",

          cancelled_at:
            cancelledAt,

          refund_status:
            providerRefundStatus,

          refund_id:
            refundId,

          refund_amount:
            refundAmount,

          refunded_at:
            refundedAt,
        })
        .eq(
          "id",
          claimedOrder.id
        )
        .select(
          ORDER_SELECT
        )
        .maybeSingle();

    if (
      cancelledOrderError ||
      !cancelledOrder
    ) {
      console.error(
        "Refund exists but order update failed:",
        cancelledOrderError
      );

      return NextResponse.json(
        {
          error:
            "The refund exists, but BLIZKITS could not finish updating the order. Do not submit another cancellation. Please contact support with your order reference.",
        },
        {
          status:
            500,
        }
      );
    }

    const {
      error:
        localPaymentError,
    } =
      await admin
        .from(
          "payments"
        )
        .update({
          status:
            orderPaymentStatus,
        })
        .eq(
          "id",
          payment.id
        );

    if (
      localPaymentError
    ) {
      console.error(
        "Unable to update local payment status after refund:",
        localPaymentError
      );
    }

    const {
      error:
        stockRestoreError,
    } =
      await admin.rpc(
        "restore_order_stock_for_cancellation",
        {
          p_order_id:
            claimedOrder.id,
        }
      );

    if (
      stockRestoreError
    ) {
      console.error(
        "Refund exists but stock restoration failed:",
        stockRestoreError
      );
    }

    const {
      data:
        finalOrder,
    } =
      await admin
        .from(
          "orders"
        )
        .select(
          ORDER_SELECT
        )
        .eq(
          "id",
          claimedOrder.id
        )
        .maybeSingle();

    const completedCancellation =
      finalOrder ??
      cancelledOrder;

    await sendCancellationEmailSafely(
      completedCancellation
    );

    return NextResponse.json({
      success:
        true,

      refunded:
        providerRefundSucceeded,

      refundProcessing:
        !providerRefundSucceeded,

      order:
        completedCancellation,
    });
  } catch (
    error
  ) {
    console.error(
      "Cancel order error:",
      error
    );

    return NextResponse.json(
      {
        error:
          getErrorMessage(
            error
          ),
      },
      {
        status:
          500,
      }
    );
  }
}