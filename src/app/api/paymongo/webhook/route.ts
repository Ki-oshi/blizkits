import crypto from "crypto";

import {
  NextResponse,
} from "next/server";

import {
  sendOrderRefundedEmail,
} from "@/lib/email/sendOrderLifecycleEmail";

import {
  finalizePaidOrder,
} from "@/lib/orders/finalizePaidOrder";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

const REFUND_EVENTS =
  new Set([
    "refund.succeeded",
    "payment.refunded",
    "payment.refund.updated",
  ]);

function safeCompare(
  a: string,
  b: string
) {
  const aBuffer =
    Buffer.from(
      a
    );

  const bBuffer =
    Buffer.from(
      b
    );

  if (
    aBuffer.length !==
    bBuffer.length
  ) {
    return false;
  }

  return crypto
    .timingSafeEqual(
      aBuffer,
      bBuffer
    );
}

function verifySignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
) {
  const parts =
    Object.fromEntries(
      signatureHeader
        .split(
          ","
        )
        .map(
          (
            part
          ) => {
            const [
              key,
              ...rest
            ] =
              part
                .trim()
                .split(
                  "="
                );

            return [
              key,
              rest.join(
                "="
              ),
            ];
          }
        )
    );

  const timestamp =
    parts.t;

  const suppliedSignature =
    parts.te ||
    parts.li;

  if (
    !timestamp ||
    !suppliedSignature
  ) {
    return false;
  }

  const signedPayload =
    `${timestamp}.${rawBody}`;

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(
        signedPayload
      )
      .digest(
        "hex"
      );

  return safeCompare(
    expectedSignature,
    suppliedSignature
  );
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

function getRefundFromPaymentResource(
  resource:
    any,

  preferredRefundId?:
    string |
    null
) {
  const refunds =
    Array.isArray(
      resource
        ?.attributes
        ?.refunds
    )
      ? resource
          .attributes
          .refunds
      : [];

  if (
    refunds.length ===
    0
  ) {
    return null;
  }

  if (
    preferredRefundId
  ) {
    const matchingRefund =
      refunds.find(
        (
          refund:
            any
        ) =>
          String(
            refund?.id ??
              ""
          ) ===
          preferredRefundId
      );

    if (
      matchingRefund
    ) {
      return matchingRefund;
    }
  }

  return refunds[
    refunds.length -
      1
  ];
}

async function sendRefundEmailSafely(
  order:
    any,

  refundId:
    string |
    null,

  refundAmount:
    number |
    null
) {
  try {
    const result =
      await sendOrderRefundedEmail({
        orderId:
          order.id,

        orderNumber:
          order.order_number,

        userId:
          order.user_id,

        refundId,

        refundAmount,
      });

    if (
      !result.sent
    ) {
      console.info(
        "Refund email skipped:",
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
      "Unable to send refund email:",
      error
    );
  }
}

async function syncRefundEvent(
  eventType:
    string,

  resource:
    any
) {
  const admin =
    createAdminClient();

  const resourceType =
    String(
      resource?.type ??
        ""
    );

  let paymongoPaymentId =
    "";

  let refund:
    any =
    null;

  let refundId =
    "";

  if (
    resourceType ===
    "refund"
  ) {
    refund =
      resource;

    refundId =
      String(
        resource?.id ??
          ""
      );

    paymongoPaymentId =
      String(
        resource
          ?.attributes
          ?.payment_id ??
          ""
      );
  } else if (
    resourceType ===
    "payment"
  ) {
    paymongoPaymentId =
      String(
        resource?.id ??
          ""
      );
  }

  let localPayment:
    any =
    null;

  if (
    paymongoPaymentId
  ) {
    const {
      data,
      error,
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
            amount,
            status,
            paymongo_payment_id
          `
        )
        .eq(
          "provider",
          "paymongo"
        )
        .eq(
          "paymongo_payment_id",
          paymongoPaymentId
        )
        .maybeSingle();

    if (
      error
    ) {
      throw new Error(
        `Unable to locate local payment for refund webhook: ${error.message}`
      );
    }

    localPayment =
      data;
  }

  let order:
    any =
    null;

  if (
    localPayment
      ?.order_id
  ) {
    const {
      data,
      error,
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
            cancellation_status,
            cancel_requested_at,
            cancelled_at,
            refund_status,
            refund_id,
            refund_amount,
            refunded_at,
            stock_restored_at
          `
        )
        .eq(
          "id",
          localPayment
            .order_id
        )
        .maybeSingle();

    if (
      error
    ) {
      throw new Error(
        `Unable to locate order for refund webhook: ${error.message}`
      );
    }

    order =
      data;
  }

  if (
    !order &&
    refundId
  ) {
    const {
      data,
      error,
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
            cancellation_status,
            cancel_requested_at,
            cancelled_at,
            refund_status,
            refund_id,
            refund_amount,
            refunded_at,
            stock_restored_at
          `
        )
        .eq(
          "refund_id",
          refundId
        )
        .maybeSingle();

    if (
      error
    ) {
      throw new Error(
        `Unable to locate order by refund ID: ${error.message}`
      );
    }

    order =
      data;

    if (
      order &&
      !localPayment
    ) {
      const {
        data:
          paymentData,

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
              amount,
              status,
              paymongo_payment_id
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
        throw new Error(
          `Unable to locate local payment by order: ${paymentError.message}`
        );
      }

      localPayment =
        paymentData;
    }
  }

  if (
    !order
  ) {
    console.info(
      "Ignoring PayMongo refund webhook with no matching BLIZKITS order:",
      {
        eventType,

        refundId:
          refundId ||
          null,

        paymongoPaymentId:
          paymongoPaymentId ||
          null,
      }
    );

    return;
  }

  if (
    resourceType ===
    "payment"
  ) {
    refund =
      getRefundFromPaymentResource(
        resource,
        order.refund_id
      );

    if (
      refund
    ) {
      refundId =
        String(
          refund?.id ??
            order.refund_id ??
            ""
        );
    }
  }

  if (
    order.refund_id &&
    refundId &&
    String(
      order.refund_id
    ) !==
      refundId
  ) {
    console.warn(
      "Ignoring refund webhook because the refund ID does not match the order:",
      {
        eventType,

        orderId:
          order.id,

        expectedRefundId:
          order.refund_id,

        receivedRefundId:
          refundId,
      }
    );

    return;
  }

  const refundAttributes =
    refund
      ?.attributes ??
    {};

  let providerRefundStatus =
    normalizeStatus(
      refundAttributes.status
    );

  if (
    eventType ===
      "refund.succeeded" ||
    eventType ===
      "payment.refunded"
  ) {
    providerRefundStatus =
      "succeeded";
  }

  if (
    !providerRefundStatus
  ) {
    console.info(
      "Refund webhook did not contain a usable refund status:",
      {
        eventType,

        orderId:
          order.id,

        refundId:
          refundId ||
          order.refund_id ||
          null,
      }
    );

    return;
  }

  const refundAmountCentavos =
    Number(
      refundAttributes.amount
    );

  const refundAmount =
    Number.isFinite(
      refundAmountCentavos
    ) &&
    refundAmountCentavos >
      0
      ? refundAmountCentavos /
        100
      : order.refund_amount ??
        localPayment
          ?.amount ??
        null;

  const providerUpdatedAt =
    toIsoFromUnix(
      refundAttributes.updated_at ??
        refundAttributes.created_at
    );

  const succeeded =
    providerRefundStatus ===
    "succeeded";

  const failed =
    providerRefundStatus ===
    "failed";

  const orderUpdate:
    Record<
      string,
      unknown
    > = {
      refund_status:
        providerRefundStatus,
    };

  if (
    refundId
  ) {
    orderUpdate.refund_id =
      refundId;
  }

  if (
    refundAmount !=
    null
  ) {
    orderUpdate.refund_amount =
      refundAmount;
  }

  if (
    succeeded
  ) {
    const completedAt =
      providerUpdatedAt ??
      new Date()
        .toISOString();

    orderUpdate.payment_status =
      "refunded";

    orderUpdate.order_status =
      "cancelled";

    orderUpdate.cancellation_status =
      "cancelled";

    orderUpdate.cancelled_at =
      order.cancelled_at ??
      completedAt;

    orderUpdate.refunded_at =
      completedAt;
  } else if (
    failed
  ) {
    orderUpdate.payment_status =
      "paid";

    orderUpdate.cancellation_status =
      "refund_failed";

    orderUpdate.refunded_at =
      null;
  } else {
    orderUpdate.payment_status =
      "paid";
  }

  const {
    error:
      orderUpdateError,
  } =
    await admin
      .from(
        "orders"
      )
      .update(
        orderUpdate
      )
      .eq(
        "id",
        order.id
      );

  if (
    orderUpdateError
  ) {
    throw new Error(
      `Unable to synchronize refund state to order: ${orderUpdateError.message}`
    );
  }

  if (
    localPayment
      ?.id
  ) {
    const localPaymentStatus =
      succeeded
        ? "refunded"
        : "paid";

    const {
      error:
        paymentUpdateError,
    } =
      await admin
        .from(
          "payments"
        )
        .update({
          status:
            localPaymentStatus,
        })
        .eq(
          "id",
          localPayment.id
        );

    if (
      paymentUpdateError
    ) {
      throw new Error(
        `Unable to synchronize refund state to payment: ${paymentUpdateError.message}`
      );
    }
  }

  if (
    succeeded
  ) {
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
      throw new Error(
        `Unable to restore cancelled order stock: ${stockRestoreError.message}`
      );
    }

    await sendRefundEmailSafely(
      order,

      refundId ||
        order.refund_id ||
        null,

      refundAmount
    );
  }

  console.log(
    "PayMongo refund synchronized:",
    {
      eventType,

      orderNumber:
        order.order_number,

      refundId:
        refundId ||
        order.refund_id ||
        null,

      refundStatus:
        providerRefundStatus,
    }
  );
}

export async function POST(
  request:
    Request
) {
  try {
    const rawBody =
      await request
        .text();

    const signatureHeader =
      request.headers.get(
        "paymongo-signature"
      );

    const webhookSecret =
      process.env
        .PAYMONGO_WEBHOOK_SECRET;

    if (
      !signatureHeader ||
      !webhookSecret
    ) {
      return NextResponse.json(
        {
          error:
            "Missing webhook signature.",
        },
        {
          status:
            401,
        }
      );
    }

    if (
      !verifySignature(
        rawBody,
        signatureHeader,
        webhookSecret
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid webhook signature.",
        },
        {
          status:
            401,
        }
      );
    }

    let payload:
      any;

    try {
      payload =
        JSON.parse(
          rawBody
        );
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid webhook payload.",
        },
        {
          status:
            400,
        }
      );
    }

    const eventType =
      payload
        ?.data
        ?.attributes
        ?.type ??
      payload
        ?.data
        ?.type;

    const resource =
      payload
        ?.data
        ?.attributes
        ?.data ??
      payload
        ?.data
        ?.data;

    if (
      eventType ===
      "checkout_session.payment.paid"
    ) {
      const referenceNumber =
        resource
          ?.attributes
          ?.reference_number;

      if (
        !referenceNumber
      ) {
        console.error(
          "Paid checkout webhook missing reference number."
        );

        return NextResponse.json({
          received:
            true,
        });
      }

      await finalizePaidOrder(
        referenceNumber
      );

      return NextResponse.json({
        received:
          true,
      });
    }

    if (
      REFUND_EVENTS.has(
        String(
          eventType ??
            ""
        )
      )
    ) {
      await syncRefundEvent(
        String(
          eventType
        ),
        resource
      );

      return NextResponse.json({
        received:
          true,
      });
    }

    return NextResponse.json({
      received:
        true,
    });
  } catch (
    error
  ) {
    console.error(
      "PayMongo webhook error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Webhook processing failed.",
      },
      {
        status:
          500,
      }
    );
  }
}