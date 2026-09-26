import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getResendClient,
  getResendFromEmail,
  getSiteUrl,
} from "@/lib/email/resend";

interface OrderEmailItem {
  product_name?: string | null;
  variant_name?: string | null;
  quantity?: number | null;
}

interface SendOrderPaidEmailInput {
  orderId: string;
  orderNumber: string;
  userId?: string | null;
  total?: number | null;
  orderItems?: OrderEmailItem[];
}

export type SendOrderPaidEmailResult =
  | {
      sent: true;
      email: string;
    }
  | {
      sent: false;
      reason:
        | "missing_user_id"
        | "order_updates_disabled"
        | "preference_lookup_failed"
        | "auth_user_lookup_failed"
        | "missing_email"
        | "resend_not_configured";
    };

function formatCurrency(value?: number | null) {
  return `₱${Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendOrderPaidEmail({
  orderId,
  orderNumber,
  userId,
  total,
  orderItems = [],
}: SendOrderPaidEmailInput): Promise<SendOrderPaidEmailResult> {
  if (!userId) {
    return {
      sent: false,
      reason: "missing_user_id",
    };
  }

  const admin = createAdminClient();

  const {
    data: notificationSettings,
    error: notificationSettingsError,
  } = await admin
    .from("user_notifications")
    .select("order_updates")
    .eq("user_id", userId)
    .maybeSingle();

  if (notificationSettingsError) {
    console.error(
      "Unable to load order notification preference:",
      notificationSettingsError
    );

    return {
      sent: false,
      reason: "preference_lookup_failed",
    };
  }

  if (notificationSettings?.order_updates === false) {
    return {
      sent: false,
      reason: "order_updates_disabled",
    };
  }

  const {
    data: authUserData,
    error: authUserError,
  } = await admin.auth.admin.getUserById(userId);

  if (authUserError || !authUserData.user) {
    console.error(
      "Unable to load Supabase Auth user for order email:",
      authUserError
    );

    return {
      sent: false,
      reason: "auth_user_lookup_failed",
    };
  }

  const email = authUserData.user.email?.trim();

  if (!email) {
    return {
      sent: false,
      reason: "missing_email",
    };
  }

  const resend = getResendClient();

  if (!resend) {
    console.warn(
      "RESEND_API_KEY is not configured. Order email was skipped."
    );

    return {
      sent: false,
      reason: "resend_not_configured",
    };
  }

  const safeOrderNumber = escapeHtml(orderNumber);
  const accountUrl = `${getSiteUrl()}/account?tab=purchases`;

  const itemRows =
    orderItems.length > 0
      ? orderItems
          .map((item) => {
            const productName = escapeHtml(
              item.product_name || "Product"
            );

            const variant = item.variant_name
              ? ` <span style="color:#737373;">(${escapeHtml(
                  item.variant_name
                )})</span>`
              : "";

            const quantity = Number(item.quantity ?? 0);

            return `
              <tr>
                <td style="padding:10px 0;color:#171717;font-size:14px;">
                  ${productName}${variant}
                </td>
                <td style="padding:10px 0;color:#525252;font-size:14px;text-align:right;">
                  × ${quantity}
                </td>
              </tr>
            `;
          })
          .join("")
      : `
          <tr>
            <td style="padding:10px 0;color:#737373;font-size:14px;">
              Your purchased items are available in your BLIZKITS account.
            </td>
          </tr>
        `;

  const textItems =
    orderItems.length > 0
      ? orderItems
          .map((item) => {
            const variant = item.variant_name
              ? ` (${item.variant_name})`
              : "";

            return `- ${item.product_name || "Product"}${variant} × ${
              item.quantity ?? 0
            }`;
          })
          .join("\n")
      : "- View your purchased items in your BLIZKITS account.";

  const { error: emailError } = await resend.emails.send(
    {
      from: getResendFromEmail(),
      to: email,
      subject: `Payment confirmed — ${orderNumber}`,
      text: [
        "BLIZKITS",
        "",
        "Payment confirmed",
        `Order: ${orderNumber}`,
        `Total: ${formatCurrency(total)}`,
        "",
        "Items:",
        textItems,
        "",
        "Your payment has been received and your order is now processing.",
        `View your order: ${accountUrl}`,
      ].join("\n"),
      html: `
        <!doctype html>
        <html>
          <body style="margin:0;padding:0;background:#fafafa;font-family:Arial,Helvetica,sans-serif;color:#171717;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafafa;padding:32px 16px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e5e5;border-radius:16px;overflow:hidden;">
                    <tr>
                      <td style="padding:28px 28px 20px;border-bottom:1px solid #f0f0f0;">
                        <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#ec4899;text-transform:uppercase;">
                          BLIZKITS
                        </div>
                        <h1 style="margin:10px 0 6px;font-size:24px;line-height:1.25;">
                          Payment confirmed
                        </h1>
                        <p style="margin:0;color:#737373;font-size:14px;line-height:1.6;">
                          We received your payment and your order is now being processed.
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding:24px 28px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="padding-bottom:6px;color:#737373;font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:1px;">
                              Order reference
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-bottom:20px;color:#171717;font-family:monospace;font-size:15px;font-weight:700;">
                              ${safeOrderNumber}
                            </td>
                          </tr>
                        </table>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #f0f0f0;border-bottom:1px solid #f0f0f0;">
                          ${itemRows}
                        </table>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;">
                          <tr>
                            <td style="color:#737373;font-size:13px;">
                              Total paid
                            </td>
                            <td style="text-align:right;color:#171717;font-size:16px;font-weight:800;">
                              ${formatCurrency(total)}
                            </td>
                          </tr>
                        </table>

                        <div style="margin-top:28px;">
                          <a
                            href="${accountUrl}"
                            style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 18px;border-radius:10px;"
                          >
                            View My Purchases
                          </a>
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding:18px 28px;background:#fafafa;color:#a3a3a3;font-size:11px;line-height:1.6;">
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
      idempotencyKey: `order-paid/${orderId}`,
    }
  );

  if (emailError) {
    throw new Error(
      `Resend could not send the order email: ${
        emailError.message || JSON.stringify(emailError)
      }`
    );
  }

  return {
    sent: true,
    email,
  };
}
