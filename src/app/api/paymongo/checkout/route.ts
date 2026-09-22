import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type PaymentMethod =
  | "gcash"
  | "paymaya"
  | "grab_pay"
  | "shopeepay"
  | "qrph"
  | "card";

interface RequestItem {
  id: string;
  quantity: number;
}

interface CheckoutRequest {
  items: RequestItem[];

  paymentMethod: PaymentMethod;

  customer: {
    email?: string;

    addressId?: string;

    recipientName: string;
    phone: string;
    addressLine: string;
    city: string;
    province: string;
    postalCode: string;
  };
}

interface VerifiedAddress {
  addressId?: string;

  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
}

const ALLOWED_PAYMENT_METHODS =
  new Set<PaymentMethod>([
    "gcash",
    "paymaya",
    "grab_pay",
    "shopeepay",
    "qrph",
    "card",
  ]);

export async function POST(
  request: Request
) {
  let createdOrderId:
    | string
    | null = null;

  try {
    /*
     * =========================================
     * AUTHENTICATION
     * =========================================
     */

    const supabase =
      await createClient();

    const admin =
      createAdminClient();

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "You must be signed in to checkout.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * =========================================
     * CONFIG
     * =========================================
     */

    const secretKey =
      process.env
        .PAYMONGO_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          error:
            "PayMongo is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =========================================
     * REQUEST
     * =========================================
     */

    const body =
      (await request.json()) as CheckoutRequest;

    const {
      items,
      paymentMethod,
      customer,
    } = body;

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Your checkout is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !ALLOWED_PAYMENT_METHODS.has(
        paymentMethod
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payment method.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedItems =
      items
        .filter(
          (item) =>
            typeof item.id ===
              "string" &&
            Number.isInteger(
              item.quantity
            ) &&
            item.quantity > 0
        )
        .map((item) => ({
          id: item.id,
          quantity:
            item.quantity,
        }));

    if (
      normalizedItems.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "No valid products were provided.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =========================================
     * VERIFY SHIPPING ADDRESS
     * =========================================
     */

    let verifiedAddress:
      VerifiedAddress;

    if (
      customer?.addressId
    ) {
      /*
       * Saved address:
       *
       * Never trust the address data
       * sent by the browser.
       */

      const {
        data: address,
        error: addressError,
      } =
        await admin
          .from("addresses")
          .select(
            `
              id,
              recipient_name,
              phone,
              address_line,
              city,
              province,
              postal_code
            `
          )
          .eq(
            "id",
            customer.addressId
          )
          .eq(
            "user_id",
            user.id
          )
          .single();

      if (
        addressError ||
        !address
      ) {
        return NextResponse.json(
          {
            error:
              "The selected delivery address could not be verified.",
          },
          {
            status: 400,
          }
        );
      }

      verifiedAddress = {
        addressId:
          address.id,

        recipientName:
          address.recipient_name,

        phone:
          address.phone,

        addressLine:
          address.address_line,

        city:
          address.city,

        province:
          address.province,

        postalCode:
          address.postal_code,
      };
    } else {
      /*
       * One-time custom address.
       */

      if (
        !customer?.recipientName?.trim() ||
        !customer?.phone?.trim() ||
        !customer?.addressLine?.trim() ||
        !customer?.city?.trim() ||
        !customer?.province?.trim() ||
        !customer?.postalCode?.trim()
      ) {
        return NextResponse.json(
          {
            error:
              "Please provide a complete delivery address.",
          },
          {
            status: 400,
          }
        );
      }

      verifiedAddress = {
        recipientName:
          customer.recipientName.trim(),

        phone:
          customer.phone.trim(),

        addressLine:
          customer.addressLine.trim(),

        city:
          customer.city.trim(),

        province:
          customer.province.trim(),

        postalCode:
          customer.postalCode.trim(),
      };
    }

    /*
     * =========================================
     * FETCH REAL PRODUCT DATA
     * =========================================
     */

    const productIds =
      normalizedItems.map(
        (item) => item.id
      );

    const {
      data: products,
      error: productsError,
    } =
      await admin
        .from("products")
        .select(
          `
            id,
            name,
            price,
            stock
          `
        )
        .in(
          "id",
          productIds
        );

    if (
      productsError ||
      !products
    ) {
      return NextResponse.json(
        {
          error:
            "Unable to verify products.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =========================================
     * BUILD ORDER ITEMS
     * =========================================
     */

    const trustedItems: {
      id: string;
      name: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    for (
      const requestedItem of
      normalizedItems
    ) {
      const product =
        products.find(
          (product) =>
            product.id ===
            requestedItem.id
        );

      if (!product) {
        return NextResponse.json(
          {
            error:
              "One of your products no longer exists.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        Number(product.stock) <
        requestedItem.quantity
      ) {
        return NextResponse.json(
          {
            error: `Only ${product.stock} unit(s) of ${product.name} are available.`,
          },
          {
            status: 400,
          }
        );
      }

      const unitPrice =
        Number(
          product.price
        );

      if (
        !Number.isFinite(
          unitPrice
        )
      ) {
        return NextResponse.json(
          {
            error: `Invalid price for ${product.name}.`,
          },
          {
            status: 500,
          }
        );
      }

      trustedItems.push({
        id:
          product.id,

        name:
          product.name,

        quantity:
          requestedItem.quantity,

        unitPrice,

        subtotal:
          unitPrice *
          requestedItem.quantity,
      });
    }

    /*
     * =========================================
     * TOTALS
     * =========================================
     */

    const subtotal =
      trustedItems.reduce(
        (sum, item) =>
          sum +
          item.subtotal,
        0
      );

    const shippingFee = 0;

    const total =
      subtotal +
      shippingFee;

    /*
     * =========================================
     * ORDER NUMBER
     * =========================================
     */

    const orderNumber =
      `BLIZ-${Date.now()}-${crypto
        .randomUUID()
        .slice(0, 8)
        .toUpperCase()}`;

    const orderId =
      crypto.randomUUID();

    createdOrderId =
      orderId;

    const now =
      new Date().toISOString();

    /*
     * =========================================
     * CREATE ORDER
     * =========================================
     */

    const {
      error: orderError,
    } =
      await admin
        .from("orders")
        .insert({
          id:
            orderId,

          order_number:
            orderNumber,

          user_id:
            user.id,

          customer_email:
            user.email ??
            customer.email ??
            "",

          shipping_address: {
            address_id:
              verifiedAddress.addressId ??
              null,

            recipient_name:
              verifiedAddress.recipientName,

            phone:
              verifiedAddress.phone,

            address_line:
              verifiedAddress.addressLine,

            city:
              verifiedAddress.city,

            province:
              verifiedAddress.province,

            postal_code:
              verifiedAddress.postalCode,
          },

          subtotal,

          shipping_fee:
            shippingFee,

          total,

          payment_status:
            "pending",

          order_status:
            "pending",

          created_at:
            now,
        });

    if (orderError) {
      console.error(
        "Order insert error:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Unable to create your order.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =========================================
     * CREATE ORDER ITEMS
     * =========================================
     */

    const orderItemRows =
      trustedItems.map(
        (item) => ({
          id:
            crypto.randomUUID(),

          order_id:
            orderId,

          product_id:
            item.id,

          variant_id:
            null,

          product_name:
            item.name,

          variant_name:
            null,

          quantity:
            item.quantity,

          unit_price:
            item.unitPrice,

          subtotal:
            item.subtotal,
        })
      );

    const {
      error:
        orderItemsError,
    } =
      await admin
        .from(
          "order_items"
        )
        .insert(
          orderItemRows
        );

    if (
      orderItemsError
    ) {
      console.error(
        "Order items error:",
        orderItemsError
      );

      await admin
        .from("orders")
        .delete()
        .eq(
          "id",
          orderId
        );

      return NextResponse.json(
        {
          error:
            "Unable to create the order items.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =========================================
     * CREATE PAYMONGO SESSION
     * =========================================
     */

    const origin =
      new URL(
        request.url
      ).origin;

    const paymongoResponse =
      await fetch(
        "https://api.paymongo.com/v2/checkout_sessions",
        {
          method: "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            Authorization:
              `Basic ${Buffer.from(
                `${secretKey}:`
              ).toString(
                "base64"
              )}`,

            "Idempotency-Key":
              orderNumber,
          },

          body:
            JSON.stringify({
              data: {
                attributes: {
                  line_items:
                    trustedItems.map(
                      (
                        item
                      ) => ({
                        name:
                          item.name,

                        amount:
                          Math.round(
                            item.unitPrice *
                              100
                          ),

                        currency:
                          "PHP",

                        quantity:
                          item.quantity,
                      })
                    ),

                  payment_method_types:
                    [
                      paymentMethod,
                    ],

                  success_url:
                    `${origin}/checkout/success?reference=${encodeURIComponent(
                      orderNumber
                    )}`,

                  cancel_url:
                    `${origin}/checkout/failed?reference=${encodeURIComponent(
                      orderNumber
                    )}`,

                  reference_number:
                    orderNumber,

                  send_email_receipt:
                    true,

                  pass_on_fees:
                    false,

                  billing: {
                    name:
                      verifiedAddress.recipientName,

                    email:
                      user.email ??
                      customer.email ??
                      "",

                    phone:
                      verifiedAddress.phone,

                    address: {
                      line1:
                        verifiedAddress.addressLine,

                      city:
                        verifiedAddress.city,

                      state:
                        verifiedAddress.province,

                      postal_code:
                        verifiedAddress.postalCode,

                      country:
                        "PH",
                    },
                  },

                  metadata: {
                    order_id:
                      orderId,

                    user_id:
                      user.id,

                    order_number:
                      orderNumber,
                  },
                },
              },
            }),
        }
      );

    const paymongoData =
      await paymongoResponse.json();

    if (
      !paymongoResponse.ok
    ) {
      console.error(
        "PayMongo error:",
        paymongoData
      );

      await admin
        .from("orders")
        .update({
          payment_status:
            "failed",

          order_status:
            "payment_failed",
        })
        .eq(
          "id",
          orderId
        );

      return NextResponse.json(
        {
          error:
            paymongoData
              ?.errors?.[0]
              ?.detail ??
            "Unable to create PayMongo checkout.",
        },
        {
          status:
            paymongoResponse.status,
        }
      );
    }

    const checkoutSessionId =
      paymongoData?.data?.id;

    const checkoutUrl =
      paymongoData
        ?.data
        ?.attributes
        ?.checkout_url;

    if (
      !checkoutSessionId ||
      !checkoutUrl
    ) {
      await admin
        .from("orders")
        .update({
          payment_status:
            "failed",

          order_status:
            "payment_failed",
        })
        .eq(
          "id",
          orderId
        );

      return NextResponse.json(
        {
          error:
            "PayMongo did not return a checkout session.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =========================================
     * PAYMENT RECORD
     * =========================================
     *
     * transaction_id temporarily stores
     * the PayMongo Checkout Session ID.
     */

    const {
      error: paymentError,
    } =
      await admin
        .from("payments")
        .insert({
          id:
            crypto.randomUUID(),

          order_id:
            orderId,

          provider:
            "paymongo",

          transaction_id:
            checkoutSessionId,

          amount:
            total,

          status:
            "pending",

          created_at:
            now,
        });

    if (paymentError) {
      console.error(
        "Payment record error:",
        paymentError
      );

      return NextResponse.json(
        {
          error:
            "Unable to save payment information.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =========================================
     * SUCCESS
     * =========================================
     */

    return NextResponse.json({
      checkoutUrl,
      checkoutSessionId,
      referenceNumber:
        orderNumber,
      orderId,
    });
  } catch (error) {
    console.error(
      "Checkout API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected checkout error occurred.",
      },
      {
        status: 500,
      }
    );
  }
}