import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderPaidEmail } from "@/lib/email/sendOrderPaidEmail";

type FinalizeResult = {
  status: "paid";
  order: any;
  productIds: string[];
};

type FinalizationRpcResult = {
  order_id?: string;
  newly_finalized?: boolean;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;

    const parts = [
      value.message,
      value.details,
      value.hint,
      value.code,
    ]
      .filter(Boolean)
      .map(String);

    if (parts.length > 0) {
      return parts.join(" | ");
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown database error.";
    }
  }

  return String(error);
}

export async function finalizePaidOrder(
  orderNumber: string
): Promise<FinalizeResult> {
  const admin = createAdminClient();

  /* =====================================================
     ATOMIC DATABASE FINALIZATION
  ===================================================== */

  /*
   * The PostgreSQL function performs the paid-order claim,
   * payment update, and stock deduction in one transaction.
   *
   * Concurrent calls for the same order are serialized by
   * SELECT ... FOR UPDATE inside the function. Only the
   * first call can decrement stock.
   */
  const {
    data: rpcData,
    error: rpcError,
  } = await admin.rpc(
    "finalize_paid_order_once",
    {
      p_order_number: orderNumber,
    }
  );

  if (rpcError) {
    throw new Error(
      `Unable to finalize paid order: ${getErrorMessage(
        rpcError
      )}`
    );
  }

  const finalization =
    (rpcData ?? {}) as FinalizationRpcResult;

  const newlyFinalized =
    finalization.newly_finalized === true;

  /* =====================================================
     LOAD FINAL ORDER
  ===================================================== */

  const {
    data: order,
    error: orderError,
  } = await admin
    .from("orders")
    .select(
      `
        id,
        order_number,
        user_id,
        payment_status,
        order_status,
        total,
        created_at,
        paid_finalized_at
      `
    )
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (orderError) {
    throw new Error(
      `Unable to load finalized order: ${getErrorMessage(
        orderError
      )}`
    );
  }

  if (!order) {
    throw new Error(
      `Order ${orderNumber} was not found after finalization.`
    );
  }

  /* =====================================================
     LOAD ORDER ITEMS
  ===================================================== */

  const {
    data: items,
    error: itemsError,
  } = await admin
    .from("order_items")
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
    .eq("order_id", order.id);

  if (itemsError) {
    throw new Error(
      `Unable to load order items: ${getErrorMessage(
        itemsError
      )}`
    );
  }

  const orderItems = items ?? [];

  const productIds = Array.from(
    new Set(
      orderItems
        .map((item) => item.product_id)
        .filter(
          (id): id is string => Boolean(id)
        )
    )
  );

  /* =====================================================
     SEND EMAIL ON FIRST SUCCESSFUL FINALIZATION ONLY
  ===================================================== */

  /*
   * Duplicate /api/paymongo/confirm requests can still
   * happen. Only the request that actually finalized the
   * order is allowed to start the confirmation email.
   *
   * Email remains non-fatal: PayMongo payment success must
   * never be presented as a failed payment because an email
   * provider is unavailable.
   */
  if (newlyFinalized) {
    try {
      const emailResult =
        await sendOrderPaidEmail({
          orderId: order.id,
          orderNumber: order.order_number,
          userId: order.user_id,
          total: order.total,
          orderItems,
        });

      if (!emailResult.sent) {
        console.info(
          "Order confirmation email skipped:",
          {
            orderId: order.id,
            reason: emailResult.reason,
          }
        );
      }
    } catch (emailError) {
      console.error(
        "Unable to send order confirmation email:",
        getErrorMessage(emailError)
      );
    }
  }

  return {
    status: "paid",
    order,
    productIds,
  };
}
