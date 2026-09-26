import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  getResendClient,
  getResendFromEmail,
  getSiteUrl,
} from "@/lib/email/resend";

/* =========================================================
   TYPES
========================================================= */

interface EmailOrderItem {
  productName:
    string;

  variantName?:
    string | null;

  quantity:
    number;

  unitPrice?:
    number | null;

  subtotal?:
    number | null;
}

interface SendOrderPaidEmailInput {
  userId:
    string;

  orderNumber:
    string;

  total:
    number;

  createdAt?:
    string | null;

  paymentMethod?:
    string | null;

  items:
    EmailOrderItem[];
}

export type SendOrderPaidEmailResult =
  | {
      sent: true;
      emailId:
        string | null;
      recipient:
        string;
    }
  | {
      sent: false;
      reason:
        | "disabled"
        | "no_email";
    };

/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(
  value:
    unknown
) {
  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

/* =========================================================
   CURRENCY
========================================================= */

function formatCurrency(
  value:
    number
) {
  return new Intl.NumberFormat(
    "en-PH",
    {
      style:
        "currency",

      currency:
        "PHP",

      minimumFractionDigits:
        2,
    }
  ).format(
    Number(
      value ?? 0
    )
  );
}

/* =========================================================
   DATE
========================================================= */

function formatDate(
  value?:
    string | null
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(
      value
    );

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
      dateStyle:
        "medium",

      timeStyle:
        "short",

      timeZone:
        "Asia/Manila",
    }
  ).format(
    date
  );
}

/* =========================================================
   PAYMENT METHOD LABEL
========================================================= */

function getPaymentMethodLabel(
  paymentMethod?:
    string | null
) {
  if (
    !paymentMethod
  ) {
    return "Online Payment";
  }

  const normalized =
    paymentMethod
      .trim()
      .toLowerCase();

  const labels:
    Record<
      string,
      string
    > = {
      gcash:
        "GCash",

      paymaya:
        "Maya",

      maya:
        "Maya",

      card:
        "Credit / Debit Card",

      grab_pay:
        "GrabPay",

      grabpay:
        "GrabPay",

      shopeepay:
        "ShopeePay",

      qrph:
        "QR Ph",
    };

  return (
    labels[
      normalized
    ] ??
    paymentMethod
  );
}

/* =========================================================
   PLAIN TEXT EMAIL
========================================================= */

function createPlainTextEmail(
  input:
    SendOrderPaidEmailInput
) {
  const itemLines =
    input.items
      .map(
        (
          item
        ) => {
          const variant =
            item.variantName
              ? ` - ${item.variantName}`
              : "";

          const amount =
            item.subtotal !=
            null
              ? ` - ${formatCurrency(
                  item.subtotal
                )}`
              : "";

          return `${item.productName}${variant} x${item.quantity}${amount}`;
        }
      )
      .join(
        "\n"
      );

  const orderDate =
    formatDate(
      input.createdAt
    );

  const accountUrl =
    `${getSiteUrl()}/account?tab=purchases`;

  return [
    "BLIZKITS",
    "",
    "Payment confirmed",
    "",
    `Order: ${input.orderNumber}`,
    orderDate
      ? `Order date: ${orderDate}`
      : "",
    `Payment method: ${getPaymentMethodLabel(
      input.paymentMethod
    )}`,
    "",
    "Items",
    itemLines ||
      "Order items unavailable.",
    "",
    `Total: ${formatCurrency(
      input.total
    )}`,
    "",
    "Your payment has been successfully confirmed and your order is now being prepared.",
    "",
    `View your order: ${accountUrl}`,
    "",
    "Thank you for shopping with BLIZKITS.",
  ]
    .filter(
      (
        line
      ) =>
        line !==
        ""
          ? true
          : true
    )
    .join(
      "\n"
    );
}

/* =========================================================
   HTML EMAIL
========================================================= */

function createHtmlEmail(
  input:
    SendOrderPaidEmailInput
) {
  const accountUrl =
    `${getSiteUrl()}/account?tab=purchases`;

  const orderDate =
    formatDate(
      input.createdAt
    );

  const paymentMethod =
    getPaymentMethodLabel(
      input.paymentMethod
    );

  const itemRows =
    input.items.length >
    0
      ? input.items
          .map(
            (
              item
            ) => {
              const productName =
                escapeHtml(
                  item.productName
                );

              const variantName =
                item.variantName
                  ? escapeHtml(
                      item.variantName
                    )
                  : null;

              const quantity =
                Number(
                  item.quantity ??
                    0
                );

              const subtotal =
                item.subtotal !=
                null
                  ? formatCurrency(
                      item.subtotal
                    )
                  : item.unitPrice !=
                      null
                    ? formatCurrency(
                        Number(
                          item.unitPrice
                        ) *
                          quantity
                      )
                    : "—";

              return `
                <tr>
                  <td
                    style="
                      padding: 14px 0;
                      border-bottom: 1px solid #f3f4f6;
                    "
                  >
                    <div
                      style="
                        font-size: 14px;
                        font-weight: 700;
                        color: #171717;
                      "
                    >
                      ${productName}
                    </div>

                    ${
                      variantName
                        ? `
                          <div
                            style="
                              margin-top: 3px;
                              font-size: 12px;
                              color: #737373;
                            "
                          >
                            ${variantName}
                          </div>
                        `
                        : ""
                    }
                  </td>

                  <td
                    align="center"
                    style="
                      padding: 14px 12px;
                      border-bottom: 1px solid #f3f4f6;
                      font-size: 13px;
                      color: #525252;
                    "
                  >
                    ${quantity}
                  </td>

                  <td
                    align="right"
                    style="
                      padding: 14px 0;
                      border-bottom: 1px solid #f3f4f6;
                      font-size: 13px;
                      font-weight: 700;
                      color: #171717;
                    "
                  >
                    ${subtotal}
                  </td>
                </tr>
              `;
            }
          )
          .join(
            ""
          )
      : `
          <tr>
            <td
              colspan="3"
              style="
                padding: 20px 0;
                font-size: 13px;
                color: #737373;
              "
            >
              Order item information is unavailable.
            </td>
          </tr>
        `;

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />

    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
    />

    <title>
      Payment confirmed
    </title>
  </head>

  <body
    style="
      margin: 0;
      padding: 0;
      background: #f7f7f7;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      color: #171717;
    "
  >
    <table
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="
        width: 100%;
        background: #f7f7f7;
      "
    >
      <tr>
        <td
          align="center"
          style="
            padding: 40px 16px;
          "
        >
          <table
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              max-width: 600px;
              background: #ffffff;
              border-radius: 20px;
              overflow: hidden;
              border: 1px solid #eeeeee;
            "
          >
            <!-- Header -->
            <tr>
              <td
                style="
                  padding: 26px 32px;
                  border-bottom: 1px solid #f3f4f6;
                "
              >
                <div
                  style="
                    font-size: 22px;
                    font-weight: 900;
                    letter-spacing: -0.5px;
                    color: #171717;
                  "
                >
                  BLIZKITS
                </div>
              </td>
            </tr>

            <!-- Main -->
            <tr>
              <td
                style="
                  padding: 36px 32px;
                "
              >
                <div
                  style="
                    display: inline-block;
                    margin-bottom: 18px;
                    padding: 7px 12px;
                    background: #ecfdf5;
                    border-radius: 999px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #047857;
                  "
                >
                  PAYMENT CONFIRMED
                </div>

                <h1
                  style="
                    margin: 0;
                    font-size: 28px;
                    line-height: 1.2;
                    color: #171717;
                  "
                >
                  Thank you for your order!
                </h1>

                <p
                  style="
                    margin: 14px 0 0;
                    font-size: 14px;
                    line-height: 1.7;
                    color: #737373;
                  "
                >
                  We've successfully received your payment. Your BLIZKITS order is now being prepared.
                </p>

                <!-- Order Info -->
                <table
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    margin-top: 28px;
                    padding: 18px;
                    background: #fafafa;
                    border-radius: 14px;
                  "
                >
                  <tr>
                    <td
                      style="
                        padding-bottom: 9px;
                        font-size: 12px;
                        color: #737373;
                      "
                    >
                      Order reference
                    </td>

                    <td
                      align="right"
                      style="
                        padding-bottom: 9px;
                        font-size: 12px;
                        font-weight: 700;
                        color: #171717;
                      "
                    >
                      ${escapeHtml(
                        input.orderNumber
                      )}
                    </td>
                  </tr>

                  ${
                    orderDate
                      ? `
                        <tr>
                          <td
                            style="
                              padding-bottom: 9px;
                              font-size: 12px;
                              color: #737373;
                            "
                          >
                            Order date
                          </td>

                          <td
                            align="right"
                            style="
                              padding-bottom: 9px;
                              font-size: 12px;
                              font-weight: 700;
                              color: #171717;
                            "
                          >
                            ${escapeHtml(
                              orderDate
                            )}
                          </td>
                        </tr>
                      `
                      : ""
                  }

                  <tr>
                    <td
                      style="
                        font-size: 12px;
                        color: #737373;
                      "
                    >
                      Payment method
                    </td>

                    <td
                      align="right"
                      style="
                        font-size: 12px;
                        font-weight: 700;
                        color: #171717;
                      "
                    >
                      ${escapeHtml(
                        paymentMethod
                      )}
                    </td>
                  </tr>
                </table>

                <!-- Items -->
                <h2
                  style="
                    margin: 30px 0 8px;
                    font-size: 15px;
                    color: #171717;
                  "
                >
                  Order summary
                </h2>

                <table
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                >
                  <thead>
                    <tr>
                      <th
                        align="left"
                        style="
                          padding-bottom: 8px;
                          font-size: 10px;
                          color: #a3a3a3;
                          text-transform: uppercase;
                          letter-spacing: 0.8px;
                        "
                      >
                        Item
                      </th>

                      <th
                        align="center"
                        style="
                          padding: 0 12px 8px;
                          font-size: 10px;
                          color: #a3a3a3;
                          text-transform: uppercase;
                          letter-spacing: 0.8px;
                        "
                      >
                        Qty
                      </th>

                      <th
                        align="right"
                        style="
                          padding-bottom: 8px;
                          font-size: 10px;
                          color: #a3a3a3;
                          text-transform: uppercase;
                          letter-spacing: 0.8px;
                        "
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    ${itemRows}
                  </tbody>
                </table>

                <!-- Total -->
                <table
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    margin-top: 18px;
                  "
                >
                  <tr>
                    <td
                      style="
                        font-size: 14px;
                        font-weight: 700;
                        color: #171717;
                      "
                    >
                      Total paid
                    </td>

                    <td
                      align="right"
                      style="
                        font-size: 18px;
                        font-weight: 900;
                        color: #ec4899;
                      "
                    >
                      ${formatCurrency(
                        input.total
                      )}
                    </td>
                  </tr>
                </table>

                <!-- Button -->
                <div
                  style="
                    margin-top: 30px;
                  "
                >
                  <a
                    href="${escapeHtml(
                      accountUrl
                    )}"
                    style="
                      display: inline-block;
                      padding: 13px 22px;
                      background: #ec4899;
                      border-radius: 12px;
                      font-size: 13px;
                      font-weight: 700;
                      color: #ffffff;
                      text-decoration: none;
                    "
                  >
                    View My Order
                  </a>
                </div>

                <p
                  style="
                    margin: 30px 0 0;
                    font-size: 12px;
                    line-height: 1.7;
                    color: #a3a3a3;
                  "
                >
                  We'll send another update when there is a change to your order status.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="
                  padding: 22px 32px;
                  background: #fafafa;
                  border-top: 1px solid #f3f4f6;
                  font-size: 11px;
                  line-height: 1.6;
                  color: #a3a3a3;
                "
              >
                This email was sent because order status notifications are enabled for your BLIZKITS account.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}

/* =========================================================
   SEND ORDER PAID EMAIL
========================================================= */

export async function sendOrderPaidEmail(
  input:
    SendOrderPaidEmailInput
): Promise<SendOrderPaidEmailResult> {
  const admin =
    createAdminClient();

  /* =======================================================
     CHECK USER PREFERENCES
  ======================================================= */

  const {
    data:
      notificationSettings,

    error:
      notificationError,
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
        input.userId
      )
      .maybeSingle();

  if (
    notificationError
  ) {
    throw new Error(
      `Unable to read notification preferences: ${notificationError.message}`
    );
  }

  /*
   * No preferences row means the
   * default setting is enabled,
   * matching the account UI.
   */
  if (
    notificationSettings
      ?.order_updates ===
    false
  ) {
    return {
      sent:
        false,

      reason:
        "disabled",
    };
  }

  /* =======================================================
     GET SIGNUP EMAIL FROM SUPABASE AUTH
  ======================================================= */

  const {
    data:
      userResult,

    error:
      userError,
  } =
    await admin.auth.admin.getUserById(
      input.userId
    );

  if (
    userError
  ) {
    throw new Error(
      `Unable to load customer email: ${userError.message}`
    );
  }

  const recipientEmail =
    userResult.user
      ?.email;

  if (
    !recipientEmail
  ) {
    return {
      sent:
        false,

      reason:
        "no_email",
    };
  }

  /* =======================================================
     SEND EMAIL
  ======================================================= */

  const resend =
    getResendClient();

  const {
    data,
    error,
  } =
    await resend.emails.send({
      from:
        getResendFromEmail(),

      to: [
        recipientEmail,
      ],

      subject:
        `Payment confirmed — ${input.orderNumber}`,

      html:
        createHtmlEmail(
          input
        ),

      text:
        createPlainTextEmail(
          input
        ),
    });

  if (
    error
  ) {
    throw new Error(
      `Unable to send order email: ${error.message}`
    );
  }

  return {
    sent:
      true,

    emailId:
      data?.id ??
      null,

    recipient:
      recipientEmail,
  };
}