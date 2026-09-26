import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getResendClient,
  getResendFromEmail,
  getSiteUrl,
} from "@/lib/email/resend";

type EmailSkipReason =
  | "missing_user_id"
  | "order_updates_disabled"
  | "preference_lookup_failed"
  | "auth_user_lookup_failed"
  | "missing_email"
  | "resend_not_configured";

export type OrderLifecycleEmailResult =
  | {
      sent: true;
      email: string;
    }
  | {
      sent: false;
      reason: EmailSkipReason;
    };

interface SendOrderCancelledEmailInput {
  orderId: string;
  orderNumber?: string | null;
  userId?: string | null;
  total?: number | null;
  reason?: string | null;
  refundStatus?: string | null;
  refundAmount?: number | null;
}

interface SendOrderRefundedEmailInput {
  orderId: string;
  orderNumber?: string | null;
  userId?: string | null;
  refundId?: string | null;
  refundAmount?: number | null;
}

function formatCurrency(
  value?: number | null
) {
  return `₱${Number(
    value ?? 0
  ).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeHtml(
  value: string
) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeStatus(
  value?: string | null
) {
  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /[\s-]+/g,
      "_"
    );
}

function formatReason(
  value?: string | null
) {
  const labels: Record<
    string,
    string
  > = {
    changed_mind:
      "Changed my mind",

    ordered_by_mistake:
      "Ordered by mistake",

    wrong_item:
      "Selected the wrong item or option",

    change_delivery_details:
      "Need to change delivery details",

    found_alternative:
      "Found another product",

    other:
      "Other",
  };

  const normalized =
    normalizeStatus(
      value
    );

  if (!normalized) {
    return "Not specified";
  }

  return (
    labels[normalized] ??
    normalized
      .replace(
        /_/g,
        " "
      )
      .replace(
        /\b\w/g,
        (
          character
        ) =>
          character.toUpperCase()
      )
  );
}

async function getRecipient(
  userId?: string | null
): Promise<
  | {
      ok: true;
      email: string;
    }
  | {
      ok: false;
      reason: EmailSkipReason;
    }
> {
  if (!userId) {
    return {
      ok: false,
      reason:
        "missing_user_id",
    };
  }

  const admin =
    createAdminClient();

  const {
    data:
      notificationSettings,

    error:
      notificationSettingsError,
  } =
    await admin
      .from(
        "user_notifications"
      )
      .select(
        "order_updates"
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

  if (
    notificationSettingsError
  ) {
    console.error(
      "Unable to load order notification preference:",
      notificationSettingsError
    );

    return {
      ok: false,
      reason:
        "preference_lookup_failed",
    };
  }

  if (
    notificationSettings
      ?.order_updates ===
    false
  ) {
    return {
      ok: false,
      reason:
        "order_updates_disabled",
    };
  }

  const {
    data:
      authUserData,

    error:
      authUserError,
  } =
    await admin.auth.admin
      .getUserById(
        userId
      );

  if (
    authUserError ||
    !authUserData.user
  ) {
    console.error(
      "Unable to load Supabase Auth user for order email:",
      authUserError
    );

    return {
      ok: false,
      reason:
        "auth_user_lookup_failed",
    };
  }

  const email =
    authUserData
      .user
      .email
      ?.trim();

  if (!email) {
    return {
      ok: false,
      reason:
        "missing_email",
    };
  }

  return {
    ok: true,
    email,
  };
}

export async function sendOrderCancelledEmail({
  orderId,
  orderNumber,
  userId,
  total,
  reason,
  refundStatus,
  refundAmount,
}: SendOrderCancelledEmailInput): Promise<OrderLifecycleEmailResult> {
  const recipient =
    await getRecipient(
      userId
    );

  if (
    recipient.ok ===
    false
  ) {
    return {
      sent: false,
      reason:
        recipient.reason,
    };
  }

  const resend =
    getResendClient();

  if (!resend) {
    return {
      sent: false,
      reason:
        "resend_not_configured",
    };
  }

  const normalizedRefundStatus =
    normalizeStatus(
      refundStatus
    );

  const refundRequired =
    normalizedRefundStatus !==
      "" &&
    normalizedRefundStatus !==
      "not_required";

  const refundCompleted =
    [
      "succeeded",
      "refunded",
    ].includes(
      normalizedRefundStatus
    );

  const resolvedOrderNumber =
    orderNumber ||
    orderId;

  const safeOrderNumber =
    escapeHtml(
      resolvedOrderNumber
    );

  const safeReason =
    escapeHtml(
      formatReason(
        reason
      )
    );

  const accountUrl =
    `${getSiteUrl()}/account?tab=purchases`;

  const refundMessage =
    refundRequired
      ? refundCompleted
        ? `A refund of ${formatCurrency(
            refundAmount ??
              total
          )} has been completed.`
        : `A refund request for ${formatCurrency(
            refundAmount ??
              total
          )} has been submitted to PayMongo. You can monitor its status in My Purchases.`
      : "No refund is required for this cancellation.";

  const {
    error:
      emailError,
  } =
    await resend.emails.send(
      {
        from:
          getResendFromEmail(),

        to:
          recipient.email,

        subject:
          `Order cancelled — ${resolvedOrderNumber}`,

        text: [
          "BLIZKITS",
          "",
          "Order cancelled",
          `Order: ${resolvedOrderNumber}`,
          `Reason: ${formatReason(
            reason
          )}`,
          `Order total: ${formatCurrency(
            total
          )}`,
          "",
          refundMessage,
          "",
          `View your order: ${accountUrl}`,
        ].join(
          "\n"
        ),

        html: `
          <!doctype html>

          <html>
            <body
              style="
                margin:0;
                padding:0;
                background:#fafafa;
                font-family:Arial,Helvetica,sans-serif;
                color:#171717;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                style="
                  background:#fafafa;
                  padding:32px 16px;
                "
              >
                <tr>
                  <td align="center">
                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      style="
                        max-width:600px;
                        background:#ffffff;
                        border:1px solid #e5e5e5;
                        border-radius:16px;
                        overflow:hidden;
                      "
                    >
                      <tr>
                        <td
                          style="
                            padding:28px;
                            border-bottom:1px solid #f0f0f0;
                          "
                        >
                          <div
                            style="
                              font-size:12px;
                              font-weight:700;
                              letter-spacing:1.5px;
                              color:#ec4899;
                              text-transform:uppercase;
                            "
                          >
                            BLIZKITS
                          </div>

                          <h1
                            style="
                              margin:10px 0 6px;
                              font-size:24px;
                              line-height:1.25;
                            "
                          >
                            Order cancelled
                          </h1>

                          <p
                            style="
                              margin:0;
                              color:#737373;
                              font-size:14px;
                              line-height:1.6;
                            "
                          >
                            Your cancellation request has been completed.
                          </p>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style="
                            padding:24px 28px;
                          "
                        >
                          <p
                            style="
                              margin:0 0 6px;
                              color:#737373;
                              font-size:12px;
                              text-transform:uppercase;
                              font-weight:700;
                              letter-spacing:1px;
                            "
                          >
                            Order reference
                          </p>

                          <p
                            style="
                              margin:0 0 20px;
                              color:#171717;
                              font-family:monospace;
                              font-size:15px;
                              font-weight:700;
                            "
                          >
                            ${safeOrderNumber}
                          </p>

                          <table
                            role="presentation"
                            width="100%"
                            cellspacing="0"
                            cellpadding="0"
                            style="
                              border-top:1px solid #f0f0f0;
                              border-bottom:1px solid #f0f0f0;
                            "
                          >
                            <tr>
                              <td
                                style="
                                  padding:12px 0;
                                  color:#737373;
                                  font-size:13px;
                                "
                              >
                                Reason
                              </td>

                              <td
                                style="
                                  padding:12px 0;
                                  text-align:right;
                                  color:#171717;
                                  font-size:13px;
                                  font-weight:700;
                                "
                              >
                                ${safeReason}
                              </td>
                            </tr>

                            <tr>
                              <td
                                style="
                                  padding:12px 0;
                                  color:#737373;
                                  font-size:13px;
                                "
                              >
                                Order total
                              </td>

                              <td
                                style="
                                  padding:12px 0;
                                  text-align:right;
                                  color:#171717;
                                  font-size:13px;
                                  font-weight:700;
                                "
                              >
                                ${formatCurrency(
                                  total
                                )}
                              </td>
                            </tr>
                          </table>

                          <p
                            style="
                              margin:20px 0 0;
                              color:#525252;
                              font-size:14px;
                              line-height:1.7;
                            "
                          >
                            ${escapeHtml(
                              refundMessage
                            )}
                          </p>

                          <div
                            style="
                              margin-top:28px;
                            "
                          >
                            <a
                              href="${accountUrl}"
                              style="
                                display:inline-block;
                                background:#ec4899;
                                color:#ffffff;
                                text-decoration:none;
                                font-size:14px;
                                font-weight:700;
                                padding:12px 18px;
                                border-radius:10px;
                              "
                            >
                              View My Purchases
                            </a>
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style="
                            padding:18px 28px;
                            background:#fafafa;
                            color:#a3a3a3;
                            font-size:11px;
                            line-height:1.6;
                          "
                        >
                          You received this email because Order Status Updates are enabled for your BLIZKITS account.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      },
      {
        idempotencyKey:
          `order-cancelled/${orderId}`,
      }
    );

  if (emailError) {
    throw new Error(
      `Resend could not send the cancellation email: ${
        emailError.message ||
        JSON.stringify(
          emailError
        )
      }`
    );
  }

  return {
    sent: true,
    email:
      recipient.email,
  };
}

export async function sendOrderRefundedEmail({
  orderId,
  orderNumber,
  userId,
  refundId,
  refundAmount,
}: SendOrderRefundedEmailInput): Promise<OrderLifecycleEmailResult> {
  const recipient =
    await getRecipient(
      userId
    );

  if (
    recipient.ok ===
    false
  ) {
    return {
      sent: false,
      reason:
        recipient.reason,
    };
  }

  const resend =
    getResendClient();

  if (!resend) {
    return {
      sent: false,
      reason:
        "resend_not_configured",
    };
  }

  const resolvedOrderNumber =
    orderNumber ||
    orderId;

  const safeOrderNumber =
    escapeHtml(
      resolvedOrderNumber
    );

  const safeRefundId =
    refundId
      ? escapeHtml(
          refundId
        )
      : "Not available";

  const accountUrl =
    `${getSiteUrl()}/account?tab=purchases`;

  const {
    error:
      emailError,
  } =
    await resend.emails.send(
      {
        from:
          getResendFromEmail(),

        to:
          recipient.email,

        subject:
          `Refund completed — ${resolvedOrderNumber}`,

        text: [
          "BLIZKITS",
          "",
          "Refund completed",
          `Order: ${resolvedOrderNumber}`,
          `Refund amount: ${formatCurrency(
            refundAmount
          )}`,
          refundId
            ? `PayMongo refund ID: ${refundId}`
            : "",
          "",
          "PayMongo has confirmed that your refund was completed.",
          `View your order: ${accountUrl}`,
        ]
          .filter(
            Boolean
          )
          .join(
            "\n"
          ),

        html: `
          <!doctype html>

          <html>
            <body
              style="
                margin:0;
                padding:0;
                background:#fafafa;
                font-family:Arial,Helvetica,sans-serif;
                color:#171717;
              "
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                style="
                  background:#fafafa;
                  padding:32px 16px;
                "
              >
                <tr>
                  <td align="center">
                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      style="
                        max-width:600px;
                        background:#ffffff;
                        border:1px solid #e5e5e5;
                        border-radius:16px;
                        overflow:hidden;
                      "
                    >
                      <tr>
                        <td
                          style="
                            padding:28px;
                            border-bottom:1px solid #f0f0f0;
                          "
                        >
                          <div
                            style="
                              font-size:12px;
                              font-weight:700;
                              letter-spacing:1.5px;
                              color:#ec4899;
                              text-transform:uppercase;
                            "
                          >
                            BLIZKITS
                          </div>

                          <h1
                            style="
                              margin:10px 0 6px;
                              font-size:24px;
                              line-height:1.25;
                            "
                          >
                            Refund completed
                          </h1>

                          <p
                            style="
                              margin:0;
                              color:#737373;
                              font-size:14px;
                              line-height:1.6;
                            "
                          >
                            PayMongo has confirmed that your refund was completed.
                          </p>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style="
                            padding:24px 28px;
                          "
                        >
                          <p
                            style="
                              margin:0 0 6px;
                              color:#737373;
                              font-size:12px;
                              text-transform:uppercase;
                              font-weight:700;
                              letter-spacing:1px;
                            "
                          >
                            Order reference
                          </p>

                          <p
                            style="
                              margin:0 0 20px;
                              color:#171717;
                              font-family:monospace;
                              font-size:15px;
                              font-weight:700;
                            "
                          >
                            ${safeOrderNumber}
                          </p>

                          <table
                            role="presentation"
                            width="100%"
                            cellspacing="0"
                            cellpadding="0"
                            style="
                              border-top:1px solid #f0f0f0;
                              border-bottom:1px solid #f0f0f0;
                            "
                          >
                            <tr>
                              <td
                                style="
                                  padding:12px 0;
                                  color:#737373;
                                  font-size:13px;
                                "
                              >
                                Refund amount
                              </td>

                              <td
                                style="
                                  padding:12px 0;
                                  text-align:right;
                                  color:#171717;
                                  font-size:15px;
                                  font-weight:800;
                                "
                              >
                                ${formatCurrency(
                                  refundAmount
                                )}
                              </td>
                            </tr>

                            <tr>
                              <td
                                style="
                                  padding:12px 0;
                                  color:#737373;
                                  font-size:13px;
                                "
                              >
                                PayMongo refund ID
                              </td>

                              <td
                                style="
                                  padding:12px 0;
                                  text-align:right;
                                  color:#171717;
                                  font-family:monospace;
                                  font-size:11px;
                                "
                              >
                                ${safeRefundId}
                              </td>
                            </tr>
                          </table>

                          <div
                            style="
                              margin-top:28px;
                            "
                          >
                            <a
                              href="${accountUrl}"
                              style="
                                display:inline-block;
                                background:#ec4899;
                                color:#ffffff;
                                text-decoration:none;
                                font-size:14px;
                                font-weight:700;
                                padding:12px 18px;
                                border-radius:10px;
                              "
                            >
                              View My Purchases
                            </a>
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style="
                            padding:18px 28px;
                            background:#fafafa;
                            color:#a3a3a3;
                            font-size:11px;
                            line-height:1.6;
                          "
                        >
                          You received this email because Order Status Updates are enabled for your BLIZKITS account.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      },
      {
        idempotencyKey:
          `order-refunded/${
            refundId ||
            orderId
          }`,
      }
    );

  if (emailError) {
    throw new Error(
      `Resend could not send the refund email: ${
        emailError.message ||
        JSON.stringify(
          emailError
        )
      }`
    );
  }

  return {
    sent: true,
    email:
      recipient.email,
  };
}