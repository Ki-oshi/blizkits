import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

/* =========================================================
   TYPES
========================================================= */

type FinalizeResult = {
  status: "paid";

  order: any;

  productIds: string[];
};

/* =========================================================
   ERROR FORMATTER
========================================================= */

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof Error
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
      .filter(Boolean)
      .map(String);

    if (
      parts.length > 0
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
      return "Unknown database error.";
    }
  }

  return String(
    error
  );
}

/* =========================================================
   FINALIZE PAID ORDER
========================================================= */

export async function finalizePaidOrder(
  orderNumber: string
): Promise<FinalizeResult> {
  const admin =
    createAdminClient();

  /* =======================================================
     FIND ORDER
  ======================================================= */

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
          total,
          created_at
        `
      )
      .eq(
        "order_number",
        orderNumber
      )
      .maybeSingle();

  if (
    orderError
  ) {
    throw new Error(
      `Unable to load order: ${getErrorMessage(
        orderError
      )}`
    );
  }

  if (
    !order
  ) {
    throw new Error(
      `Order ${orderNumber} was not found.`
    );
  }

  /* =======================================================
     LOAD ORDER ITEMS
  ======================================================= */

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
        `
          id,
          product_id,
          variant_id,
          product_name,
          variant_name,
          quantity
        `
      )
      .eq(
        "order_id",
        order.id
      );

  if (
    itemsError
  ) {
    throw new Error(
      `Unable to load order items: ${getErrorMessage(
        itemsError
      )}`
    );
  }

  const orderItems =
    items ?? [];

  const productIds =
    orderItems
      .map(
        (
          item
        ) =>
          item.product_id
      )
      .filter(
        (
          id
        ): id is string =>
          Boolean(id)
      );

  /* =======================================================
     ALREADY PAID
  ======================================================= */

  if (
    order.payment_status ===
    "paid"
  ) {
    return {
      status:
        "paid",

      order,

      productIds,
    };
  }

  /* =======================================================
     MARK ORDER AS PAID
  ======================================================= */

  /*
   * PayMongo has already confirmed payment
   * before this function is called.
   *
   * Therefore the correct payment state is:
   *
   * pending -> paid
   *
   * Do NOT use "processing" as a
   * payment_status.
   *
   * "processing" belongs to order_status.
   */
  const {
    data:
      paidOrder,
    error:
      paidOrderError,
  } =
    await admin
      .from(
        "orders"
      )
      .update({
        payment_status:
          "paid",

        order_status:
          "processing",
      })
      .eq(
        "id",
        order.id
      )
      .select(
        `
          id,
          order_number,
          user_id,
          payment_status,
          order_status,
          total,
          created_at
        `
      )
      .maybeSingle();

  if (
    paidOrderError
  ) {
    throw new Error(
      `Unable to mark order as paid: ${getErrorMessage(
        paidOrderError
      )}`
    );
  }

  if (
    !paidOrder
  ) {
    throw new Error(
      "The order could not be marked as paid."
    );
  }

  /*
   * From this point onward PayMongo has
   * confirmed payment and our order is
   * recorded as paid.
   *
   * Secondary reconciliation failures
   * should NOT tell the customer their
   * payment failed.
   */
  let requiresAttention =
    false;

  /* =======================================================
     UPDATE PAYMENT RECORD
  ======================================================= */

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
          "paid",
      })
      .eq(
        "order_id",
        order.id
      )
      .eq(
        "provider",
        "paymongo"
      );

  if (
    paymentUpdateError
  ) {
    requiresAttention =
      true;

    console.error(
      "Unable to update payment record:",
      getErrorMessage(
        paymentUpdateError
      )
    );
  }

  /* =======================================================
     UPDATE PRODUCT STOCK
  ======================================================= */

  for (
    const item of
    orderItems
  ) {
    /*
     * Skip deleted products / items
     * without a product relationship.
     */
    if (
      !item.product_id
    ) {
      continue;
    }

    const quantity =
      Number(
        item.quantity
      );

    if (
      !Number.isFinite(
        quantity
      ) ||
      quantity <= 0
    ) {
      requiresAttention =
        true;

      console.error(
        "Invalid order item quantity:",
        {
          orderId:
            order.id,

          itemId:
            item.id,

          quantity:
            item.quantity,
        }
      );

      continue;
    }

    /* =============================
       GET CURRENT STOCK
    ============================= */

    const {
      data:
        product,
      error:
        productError,
    } =
      await admin
        .from(
          "products"
        )
        .select(
          `
            id,
            stock
          `
        )
        .eq(
          "id",
          item.product_id
        )
        .maybeSingle();

    if (
      productError
    ) {
      requiresAttention =
        true;

      console.error(
        `Unable to load product ${item.product_id}:`,
        getErrorMessage(
          productError
        )
      );

      continue;
    }

    if (
      !product
    ) {
      requiresAttention =
        true;

      console.error(
        "Product missing during stock update:",
        item.product_id
      );

      continue;
    }

    const currentStock =
      Number(
        product.stock ??
          0
      );

    if (
      !Number.isFinite(
        currentStock
      )
    ) {
      requiresAttention =
        true;

      console.error(
        "Invalid product stock value:",
        {
          productId:
            product.id,

          stock:
            product.stock,
        }
      );

      continue;
    }

    /*
     * Don't allow negative stock.
     */
    const nextStock =
      Math.max(
        0,
        currentStock -
          quantity
      );

    if (
      currentStock <
      quantity
    ) {
      requiresAttention =
        true;

      console.error(
        "Insufficient stock while finalizing paid order:",
        {
          productId:
            product.id,

          currentStock,

          orderedQuantity:
            quantity,
        }
      );
    }

    /* =============================
       SAVE NEW STOCK
    ============================= */

    const {
      error:
        stockUpdateError,
    } =
      await admin
        .from(
          "products"
        )
        .update({
          stock:
            nextStock,
        })
        .eq(
          "id",
          item.product_id
        );

    if (
      stockUpdateError
    ) {
      requiresAttention =
        true;

      console.error(
        `Unable to update stock for ${item.product_id}:`,
        getErrorMessage(
          stockUpdateError
        )
      );
    }
  }

  /* =======================================================
     FINAL ORDER STATUS
  ======================================================= */

  const finalOrderStatus =
    requiresAttention
      ? "requires_attention"
      : "processing";

  const {
    data:
      finalOrder,
    error:
      finalOrderError,
  } =
    await admin
      .from(
        "orders"
      )
      .update({
        /*
         * Keep payment_status paid.
         */
        payment_status:
          "paid",

        order_status:
          finalOrderStatus,
      })
      .eq(
        "id",
        order.id
      )
      .select(
        `
          id,
          order_number,
          user_id,
          payment_status,
          order_status,
          total,
          created_at
        `
      )
      .maybeSingle();

  if (
    finalOrderError
  ) {
    /*
     * Payment has already been safely
     * recorded as paid above.
     *
     * Don't turn this into a false
     * payment failure for the customer.
     */
    console.error(
      "Unable to update final order status:",
      getErrorMessage(
        finalOrderError
      )
    );
  }

  /* =======================================================
     COMPLETE
  ======================================================= */

  return {
    status:
      "paid",

    order:
      finalOrder ??
      {
        ...paidOrder,

        order_status:
          finalOrderStatus,
      },

    productIds,
  };
}