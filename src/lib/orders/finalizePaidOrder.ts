import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function finalizePaidOrder(
  orderNumber: string
) {
  const admin =
    createAdminClient();

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
        orderNumber
      )
      .single();

  if (
    orderError ||
    !order
  ) {
    return {
      ok: false,
      status:
        "not_found",
      productIds: [],
    };
  }

  /*
   * Already processed.
   *
   * Important because PayMongo may
   * deliver webhooks more than once.
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

    return {
      ok: true,
      status: "paid",
      order,
      productIds:
        (
          items ?? []
        )
          .map(
            (item) =>
              item.product_id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          ),
    };
  }

  /*
   * Claim this order.
   *
   * Only one request should perform
   * fulfillment.
   */
  const {
    data: claimed,
    error: claimError,
  } =
    await admin
      .from("orders")
      .update({
        payment_status:
          "processing",
      })
      .eq(
        "id",
        order.id
      )
      .eq(
        "payment_status",
        "pending"
      )
      .select("id")
      .maybeSingle();

  if (claimError) {
    throw claimError;
  }

  /*
   * Another webhook/confirmation
   * may already be processing it.
   */
  if (!claimed) {
    const {
      data:
        currentOrder,
    } =
      await admin
        .from("orders")
        .select(
          "payment_status, order_status"
        )
        .eq(
          "id",
          order.id
        )
        .single();

    return {
      ok:
        currentOrder
          ?.payment_status ===
        "paid",

      status:
        currentOrder
          ?.payment_status ??
        "processing",

      order:
        currentOrder,

      productIds: [],
    };
  }

  /*
   * Load purchased items.
   */
  const {
    data: orderItems,
    error: itemsError,
  } =
    await admin
      .from(
        "order_items"
      )
      .select(
        `
          product_id,
          quantity
        `
      )
      .eq(
        "order_id",
        order.id
      );

  if (itemsError) {
    throw itemsError;
  }

  let stockIssue =
    false;

  /*
   * Reduce product stock.
   */
  for (
    const item of
    orderItems ?? []
  ) {
    if (
      !item.product_id
    ) {
      continue;
    }

    const {
      data: product,
      error:
        productError,
    } =
      await admin
        .from("products")
        .select(
          "id, stock"
        )
        .eq(
          "id",
          item.product_id
        )
        .single();

    if (
      productError ||
      !product
    ) {
      stockIssue =
        true;

      continue;
    }

    const currentStock =
      Number(
        product.stock
      );

    const quantity =
      Number(
        item.quantity
      );

    if (
      currentStock <
      quantity
    ) {
      stockIssue =
        true;

      continue;
    }

    const {
      error:
        stockError,
    } =
      await admin
        .from("products")
        .update({
          stock:
            currentStock -
            quantity,
        })
        .eq(
          "id",
          item.product_id
        );

    if (stockError) {
      stockIssue =
        true;
    }
  }

  /*
   * Payment was confirmed by PayMongo.
   */
  await admin
    .from("payments")
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

  /*
   * Mark order paid.
   */
  const {
    data:
      updatedOrder,
    error:
      updateError,
  } =
    await admin
      .from("orders")
      .update({
        payment_status:
          "paid",

        order_status:
          stockIssue
            ? "requires_attention"
            : "processing",
      })
      .eq(
        "id",
        order.id
      )
      .select("*")
      .single();

  if (updateError) {
    throw updateError;
  }

  return {
    ok: true,

    status:
      "paid",

    order:
      updatedOrder,

    stockIssue,

    productIds:
      (
        orderItems ??
        []
      )
        .map(
          (item) =>
            item.product_id
        )
        .filter(
          (
            id
          ): id is string =>
            Boolean(id)
        ),
  };
}