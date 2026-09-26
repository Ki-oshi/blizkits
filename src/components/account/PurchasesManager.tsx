"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import Button from "@/components/ui/Button";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Hash,
  Loader2,
  MapPin,
  Package,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  Truck,
  WalletCards,
  X,
} from "lucide-react";

interface OrderItem {
  id: string;
  order_id?: string | null;
  product_id?: string | null;
  variant_id?: string | null;
  product_name?: string | null;
  variant_name?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  subtotal?: number | null;
}

interface Payment {
  id: string;
  order_id?: string | null;
  provider?: string | null;
  transaction_id?: string | null;
  amount?: number | null;
  status?: string | null;
  checkout_session_id?: string | null;
  paymongo_payment_id?: string | null;
  external_reference_number?: string | null;
  payment_method?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
}

interface ShippingAddress {
  full_name?: string;
  recipient_name?: string;
  name?: string;

  phone?: string;
  phone_number?: string;

  address_line1?: string;
  address_line2?: string;

  street?: string;
  street_address?: string;

  barangay?: string;
  city?: string;
  municipality?: string;
  province?: string;
  region?: string;

  postal_code?: string;
  zip_code?: string;

  country?: string;

  [key: string]: unknown;
}

interface Order {
  id: string;
  order_number?: string | null;
  user_id?: string | null;
  customer_email?: string | null;
  shipping_address?: ShippingAddress | null;

  subtotal?: number | null;
  shipping_fee?: number | null;
  total?: number | null;

  payment_status?: string | null;
  order_status?: string | null;

  created_at?: string | null;

  cancellation_status?: string | null;
  cancel_reason?: string | null;
  cancel_notes?: string | null;
  cancel_requested_at?: string | null;
  cancelled_at?: string | null;

  refund_status?: string | null;
  refund_id?: string | null;
  refund_amount?: number | null;
  refunded_at?: string | null;
  stock_restored_at?: string | null;

  order_items?: OrderItem[] | null;
  payments?: Payment[] | null;
}

interface PurchasesManagerProps {
  initialOrders: Order[];
}

const CANCELLATION_REASONS = [
  {
    value: "changed_mind",
    label: "I changed my mind",
  },
  {
    value: "ordered_by_mistake",
    label: "I ordered by mistake",
  },
  {
    value: "wrong_item",
    label: "I selected the wrong item or option",
  },
  {
    value: "change_delivery_details",
    label: "I need to change my delivery details",
  },
  {
    value: "found_alternative",
    label: "I found another product",
  },
  {
    value: "other",
    label: "Other",
  },
] as const;

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

function formatCurrency(
  value?: number | null
) {
  return `₱${Number(
    value ?? 0
  ).toLocaleString(
    "en-PH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return date.toLocaleString(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function formatShortDate(
  value?: string | null
) {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

function formatStatus(
  status?: string | null
) {
  if (!status) {
    return "Pending";
  }

  return status
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
    );
}

function getOrderStatusClasses(
  status?: string | null
) {
  switch (
    normalizeStatus(
      status
    )
  ) {
    case "delivered":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "shipped":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "processing":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "cancelled":
    case "canceled":
      return "border-red-200 bg-red-50 text-red-700";

    case "pending":
    default:
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
  }
}

function getPaymentStatusClasses(
  status?: string | null
) {
  switch (
    normalizeStatus(
      status
    )
  ) {
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "refunded":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "failed":
      return "border-red-200 bg-red-50 text-red-700";

    case "pending":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getCancellationStatusClasses(
  status?: string | null
) {
  switch (
    normalizeStatus(
      status
    )
  ) {
    case "cancelled":
    case "canceled":
      return "border-red-200 bg-red-50 text-red-700";

    case "processing":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "refund_failed":
    case "failed":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
  }
}

function getRefundStatusClasses(
  status?: string | null
) {
  switch (
    normalizeStatus(
      status
    )
  ) {
    case "succeeded":
    case "refunded":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "processing":
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "failed":
      return "border-red-200 bg-red-50 text-red-700";

    case "not_required":
      return "border-neutral-200 bg-neutral-100 text-neutral-700";

    default:
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
  }
}

function getPaymentMethodLabel(
  method?: string | null
) {
  if (!method) {
    return "Not available";
  }

  const normalized =
    method.toLowerCase();

  const labels:
    Record<
      string,
      string
    > = {
      gcash: "GCash",
      paymaya: "Maya",
      maya: "Maya",
      card:
        "Credit / Debit Card",
      credit_card:
        "Credit Card",
      debit_card:
        "Debit Card",
      grab_pay:
        "GrabPay",
      grabpay:
        "GrabPay",
      billease:
        "BillEase",
      dob:
        "Direct Online Banking",
    };

  return (
    labels[
      normalized
    ] ||
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

function getShippingName(
  address?:
    ShippingAddress |
    null
) {
  if (!address) {
    return "";
  }

  return (
    address.full_name ||
    address.recipient_name ||
    address.name ||
    ""
  );
}

function getShippingPhone(
  address?:
    ShippingAddress |
    null
) {
  if (!address) {
    return "";
  }

  return (
    address.phone ||
    address.phone_number ||
    ""
  );
}

function getShippingAddressLines(
  address?:
    ShippingAddress |
    null
) {
  if (!address) {
    return [];
  }

  const firstLine =
    address.address_line1 ||
    address.street_address ||
    address.street ||
    "";

  const secondLine =
    address.address_line2 ||
    "";

  const locality = [
    address.barangay,
    address.city ||
      address.municipality,
    address.province ||
      address.region,
  ]
    .filter(
      Boolean
    )
    .join(
      ", "
    );

  const postalAndCountry =
    [
      address.postal_code ||
        address.zip_code,
      address.country,
    ]
      .filter(
        Boolean
      )
      .join(
        ", "
      );

  return [
    firstLine,
    secondLine,
    locality,
    postalAndCountry,
  ].filter(
    Boolean
  );
}

function getLatestPayment(
  order:
    Order
) {
  if (
    !order.payments
      ?.length
  ) {
    return null;
  }

  return [
    ...order.payments,
  ].sort(
    (
      a,
      b
    ) => {
      const aDate =
        new Date(
          a.paid_at ||
            a.created_at ||
            0
        ).getTime();

      const bDate =
        new Date(
          b.paid_at ||
            b.created_at ||
            0
        ).getTime();

      return (
        bDate -
        aDate
      );
    }
  )[0];
}

function canCancelOrder(
  order:
    Order
) {
  const orderStatus =
    normalizeStatus(
      order.order_status
    );

  const cancellationStatus =
    normalizeStatus(
      order.cancellation_status
    );

  const refundStatus =
    normalizeStatus(
      order.refund_status
    );

  if (
    ![
      "pending",
      "processing",
    ].includes(
      orderStatus
    )
  ) {
    return false;
  }

  if (
    [
      "processing",
      "cancelled",
      "canceled",
      "refund_failed",
    ].includes(
      cancellationStatus
    )
  ) {
    return false;
  }

  if (
    [
      "failed",
      "succeeded",
    ].includes(
      refundStatus
    )
  ) {
    return false;
  }

  return true;
}

function formatCancellationReason(
  value?:
    string |
    null
) {
  if (!value) {
    return "Not available";
  }

  return (
    CANCELLATION_REASONS.find(
      (
        reason
      ) =>
        reason.value ===
        value
    )?.label ??
    formatStatus(
      value
    )
  );
}

export default function PurchasesManager({
  initialOrders = [],
}: PurchasesManagerProps) {
  const router =
    useRouter();

  const [
    orders,
    setOrders,
  ] =
    useState<
      Order[]
    >(
      initialOrders ||
        []
    );

  const [
    selectedOrder,
    setSelectedOrder,
  ] =
    useState<
      Order |
      null
    >(
      null
    );

  const [
    cancelModalOpen,
    setCancelModalOpen,
  ] =
    useState(
      false
    );

  const [
    cancelReason,
    setCancelReason,
  ] =
    useState(
      ""
    );

  const [
    cancelNotes,
    setCancelNotes,
  ] =
    useState(
      ""
    );

  const [
    cancelError,
    setCancelError,
  ] =
    useState<
      string |
      null
    >(
      null
    );

  const [
    isCancelling,
    setIsCancelling,
  ] =
    useState(
      false
    );

  function openCancelModal() {
    if (
      !selectedOrder
    ) {
      return;
    }

    setCancelReason(
      selectedOrder
        .cancel_reason ??
        ""
    );

    setCancelNotes(
      selectedOrder
        .cancel_notes ??
        ""
    );

    setCancelError(
      null
    );

    setCancelModalOpen(
      true
    );
  }

  function closeCancelModal() {
    if (
      isCancelling
    ) {
      return;
    }

    setCancelModalOpen(
      false
    );

    setCancelError(
      null
    );
  }

  async function handleCancelOrder() {
    if (
      !selectedOrder ||
      !cancelReason ||
      isCancelling
    ) {
      return;
    }

    setIsCancelling(
      true
    );

    setCancelError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/orders/${selectedOrder.id}/cancel`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                reason:
                  cancelReason,

                notes:
                  cancelNotes.trim(),
              }),
          }
        );

      let result:
        any =
        null;

      try {
        result =
          await response.json();
      } catch {
        result =
          null;
      }

      if (
        !response.ok
      ) {
        throw new Error(
          result?.error ??
            "Unable to cancel this order."
        );
      }

      const updatedOrder:
        Order = {
          ...selectedOrder,
          ...(
            result?.order ??
            {}
          ),
        };

      setSelectedOrder(
        updatedOrder
      );

      setOrders(
        (
          current
        ) =>
          current.map(
            (
              order
            ) =>
              order.id ===
              updatedOrder.id
                ? {
                    ...order,
                    ...updatedOrder,
                  }
                : order
          )
      );

      setCancelModalOpen(
        false
      );

      setCancelReason(
        ""
      );

      setCancelNotes(
        ""
      );
    } catch (
      error
    ) {
      console.error(
        "Cancel order error:",
        error
      );

      setCancelError(
        error instanceof
        Error
          ? error.message
          : "Unable to cancel this order."
      );
    } finally {
      setIsCancelling(
        false
      );
    }
  }

  if (
    selectedOrder
  ) {
    const payment =
      getLatestPayment(
        selectedOrder
      );

    const shippingName =
      getShippingName(
        selectedOrder
          .shipping_address
      );

    const shippingPhone =
      getShippingPhone(
        selectedOrder
          .shipping_address
      );

    const shippingLines =
      getShippingAddressLines(
        selectedOrder
          .shipping_address
      );

    const orderReference =
      selectedOrder
        .order_number ||
      selectedOrder.id;

    const cancellationAllowed =
      canCancelOrder(
        selectedOrder
      );

    const hasCancellationDetails =
      Boolean(
        selectedOrder
          .cancellation_status ||
        selectedOrder
          .cancel_reason ||
        selectedOrder
          .cancel_requested_at ||
        selectedOrder
          .cancelled_at ||
        selectedOrder
          .refund_status ||
        selectedOrder
          .refund_id
      );

    const paymentIsPaid =
      normalizeStatus(
        selectedOrder
          .payment_status
      ) ===
      "paid";

    return (
      <>
        <div className="space-y-6">
          <button
            type="button"
            onClick={() =>
              setSelectedOrder(
                null
              )
            }
            className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-neutral-600 transition-colors hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All Purchases
          </button>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 border-b border-neutral-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
                  <ReceiptText className="h-4 w-4" />
                  Order Reference
                </div>

                <h2 className="break-all font-mono text-lg font-black text-neutral-900 sm:text-xl">
                  {orderReference}
                </h2>

                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <CalendarDays className="h-3.5 w-3.5" />

                  Placed{" "}
                  {formatDate(
                    selectedOrder
                      .created_at
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${getOrderStatusClasses(
                    selectedOrder
                      .order_status
                  )}`}
                >
                  <Truck className="h-3.5 w-3.5" />

                  {formatStatus(
                    selectedOrder
                      .order_status
                  )}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${getPaymentStatusClasses(
                    selectedOrder
                      .payment_status
                  )}`}
                >
                  <CreditCard className="h-3.5 w-3.5" />

                  {formatStatus(
                    selectedOrder
                      .payment_status
                  )}
                </span>

                {cancellationAllowed ? (
                  <button
                    type="button"
                    onClick={
                      openCancelModal
                    }
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-600 transition hover:bg-red-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel Order
                  </button>
                ) : null}
              </div>
            </div>

            <div className="pt-6">
              <div className="mb-4 flex items-center gap-2">
                <Package className="h-4 w-4 text-pink-500" />

                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Purchased Items
                </h3>
              </div>

              {selectedOrder
                .order_items
                ?.length ? (
                <div className="overflow-hidden rounded-xl border border-neutral-200">
                  <div className="divide-y divide-neutral-100">
                    {selectedOrder.order_items.map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-900">
                              {item.product_name ||
                                "Product"}
                            </p>

                            {item.variant_name ? (
                              <p className="mt-0.5 text-xs text-neutral-500">
                                Variant:{" "}
                                {
                                  item.variant_name
                                }
                              </p>
                            ) : null}

                            <p className="mt-1 text-xs text-neutral-500">
                              {formatCurrency(
                                item.unit_price
                              )}{" "}
                              ×{" "}
                              {item.quantity ??
                                0}
                            </p>
                          </div>

                          <p className="shrink-0 font-mono text-sm font-bold text-neutral-900">
                            {formatCurrency(
                              item.subtotal ??
                                Number(
                                  item.unit_price ??
                                    0
                                ) *
                                  Number(
                                    item.quantity ??
                                      0
                                  )
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-5 text-center">
                  <p className="text-xs text-neutral-500">
                    No item details are available for this order.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-900">
                Order Summary
              </h3>

              <div className="overflow-hidden rounded-xl border border-neutral-200">
                <div className="space-y-3 bg-neutral-50 p-4 text-xs">
                  <div className="flex items-center justify-between gap-4 text-neutral-600">
                    <span>
                      Subtotal
                    </span>

                    <span className="font-mono font-semibold text-neutral-900">
                      {formatCurrency(
                        selectedOrder
                          .subtotal
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 text-neutral-600">
                    <span>
                      Shipping Fee
                    </span>

                    <span className="font-mono font-semibold text-neutral-900">
                      {Number(
                        selectedOrder
                          .shipping_fee ??
                          0
                      ) === 0
                        ? "FREE"
                        : formatCurrency(
                            selectedOrder
                              .shipping_fee
                          )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-neutral-200 pt-3">
                    <span className="font-bold text-neutral-900">
                      Total
                    </span>

                    <span className="font-mono text-base font-black text-pink-600">
                      {formatCurrency(
                        selectedOrder
                          .total
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-pink-500" />

                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Shipping Address
                </h3>
              </div>

              {selectedOrder
                .shipping_address ? (
                <div className="space-y-1.5 text-sm">
                  {shippingName ? (
                    <p className="font-bold text-neutral-900">
                      {
                        shippingName
                      }
                    </p>
                  ) : null}

                  {shippingPhone ? (
                    <p className="text-xs text-neutral-500">
                      {
                        shippingPhone
                      }
                    </p>
                  ) : null}

                  {shippingLines.length >
                  0 ? (
                    <div className="pt-2 text-xs leading-6 text-neutral-600">
                      {shippingLines.map(
                        (
                          line,
                          index
                        ) => (
                          <p
                            key={`${line}-${index}`}
                          >
                            {
                              line
                            }
                          </p>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Address information is unavailable.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-neutral-500">
                  No shipping address is available for this order.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <WalletCards className="h-4 w-4 text-pink-500" />

                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Payment Details
                </h3>
              </div>

              {payment ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Provider
                      </p>

                      <p className="mt-1 text-xs font-semibold text-neutral-900">
                        {payment.provider
                          ? formatStatus(
                              payment.provider
                            )
                          : "PayMongo"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Payment Method
                      </p>

                      <p className="mt-1 text-xs font-semibold text-neutral-900">
                        {getPaymentMethodLabel(
                          payment.payment_method
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Amount
                      </p>

                      <p className="mt-1 font-mono text-xs font-semibold text-neutral-900">
                        {formatCurrency(
                          payment.amount ??
                            selectedOrder
                              .total
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Paid At
                      </p>

                      <p className="mt-1 text-xs font-semibold text-neutral-900">
                        {formatDate(
                          payment.paid_at
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-neutral-100 pt-4">
                    {payment.paymongo_payment_id ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          PayMongo Payment ID
                        </p>

                        <p className="mt-1 break-all font-mono text-[11px] text-neutral-700">
                          {payment.paymongo_payment_id}
                        </p>
                      </div>
                    ) : null}

                    {payment.external_reference_number ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          External Reference
                        </p>

                        <p className="mt-1 break-all font-mono text-[11px] text-neutral-700">
                          {payment.external_reference_number}
                        </p>
                      </div>
                    ) : null}

                    {payment.checkout_session_id ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Checkout Session
                        </p>

                        <p className="mt-1 break-all font-mono text-[11px] text-neutral-700">
                          {payment.checkout_session_id}
                        </p>
                      </div>
                    ) : null}

                    {!payment.paymongo_payment_id &&
                    !payment.external_reference_number &&
                    !payment.checkout_session_id &&
                    payment.transaction_id ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          Transaction Reference
                        </p>

                        <p className="mt-1 break-all font-mono text-[11px] text-neutral-700">
                          {payment.transaction_id}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs text-neutral-500">
                    No payment record is currently available for this order.
                  </p>
                </div>
              )}
            </div>
          </div>

          {hasCancellationDetails ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-red-500" />

                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Cancellation & Refund
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Cancellation Status
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getCancellationStatusClasses(
                      selectedOrder
                        .cancellation_status
                    )}`}
                  >
                    {formatStatus(
                      selectedOrder
                        .cancellation_status
                    )}
                  </span>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Reason
                  </p>

                  <p className="mt-2 text-xs font-semibold text-neutral-900">
                    {formatCancellationReason(
                      selectedOrder
                        .cancel_reason
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Requested At
                  </p>

                  <p className="mt-2 text-xs font-semibold text-neutral-900">
                    {formatDate(
                      selectedOrder
                        .cancel_requested_at
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Refund Status
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getRefundStatusClasses(
                      selectedOrder
                        .refund_status
                    )}`}
                  >
                    {formatStatus(
                      selectedOrder
                        .refund_status
                    )}
                  </span>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Refund Amount
                  </p>

                  <p className="mt-2 font-mono text-xs font-semibold text-neutral-900">
                    {selectedOrder
                      .refund_amount !=
                    null
                      ? formatCurrency(
                          selectedOrder
                            .refund_amount
                        )
                      : "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Refunded At
                  </p>

                  <p className="mt-2 text-xs font-semibold text-neutral-900">
                    {formatDate(
                      selectedOrder
                        .refunded_at
                    )}
                  </p>
                </div>
              </div>

              {selectedOrder
                .cancel_notes ? (
                <div className="mt-5 border-t border-neutral-100 pt-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Notes
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-neutral-700">
                    {selectedOrder.cancel_notes}
                  </p>
                </div>
              ) : null}

              {selectedOrder
                .refund_id ? (
                <div className="mt-5 border-t border-neutral-100 pt-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    PayMongo Refund ID
                  </p>

                  <p className="mt-2 break-all font-mono text-[11px] text-neutral-700">
                    {selectedOrder.refund_id}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-start gap-3">
              <Hash className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Internal Order ID
                </p>

                <p className="mt-1 break-all font-mono text-[11px] text-neutral-600">
                  {selectedOrder.id}
                </p>
              </div>
            </div>
          </div>
        </div>

        {cancelModalOpen ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 py-8">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-neutral-100 p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-base font-black text-neutral-900">
                      Cancel this order?
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      {paymentIsPaid
                        ? "This order has already been paid. BLIZKITS will request a full refund through PayMongo after you confirm the cancellation."
                        : "This order has not been paid yet, so it can be cancelled without a refund."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    closeCancelModal
                  }
                  disabled={
                    isCancelling
                  }
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close cancellation dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <label
                    htmlFor="cancel-reason"
                    className="text-xs font-bold text-neutral-800"
                  >
                    Reason for cancellation
                  </label>

                  <select
                    id="cancel-reason"
                    value={
                      cancelReason
                    }
                    onChange={(
                      event
                    ) =>
                      setCancelReason(
                        event
                          .target
                          .value
                      )
                    }
                    disabled={
                      isCancelling
                    }
                    className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100 disabled:bg-neutral-50"
                  >
                    <option value="">
                      Select a reason
                    </option>

                    {CANCELLATION_REASONS.map(
                      (
                        reason
                      ) => (
                        <option
                          key={
                            reason.value
                          }
                          value={
                            reason.value
                          }
                        >
                          {
                            reason.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="cancel-notes"
                      className="text-xs font-bold text-neutral-800"
                    >
                      Additional notes
                    </label>

                    <span className="text-[10px] text-neutral-400">
                      {cancelNotes.length}/500
                    </span>
                  </div>

                  <textarea
                    id="cancel-notes"
                    value={
                      cancelNotes
                    }
                    onChange={(
                      event
                    ) =>
                      setCancelNotes(
                        event
                          .target
                          .value
                          .slice(
                            0,
                            500
                          )
                      )
                    }
                    disabled={
                      isCancelling
                    }
                    rows={
                      4
                    }
                    placeholder={
                      cancelReason ===
                      "other"
                        ? "Tell us why you want to cancel..."
                        : "Optional details about your cancellation..."
                    }
                    className="mt-2 w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 disabled:bg-neutral-50"
                  />
                </div>

                {cancelError ? (
                  <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                    <span>
                      {
                        cancelError
                      }
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 p-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeCancelModal
                  }
                  disabled={
                    isCancelling
                  }
                  className="cursor-pointer rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Keep Order
                </button>

                <button
                  type="button"
                  onClick={
                    handleCancelOrder
                  }
                  disabled={
                    !cancelReason ||
                    isCancelling
                  }
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      Cancel Order
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">
            My Purchases
          </h2>

          <p className="mt-1 text-xs text-neutral-500">
            View your orders, payment details, and delivery status.
          </p>
        </div>

        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
          {orders.length}{" "}
          {orders.length ===
          1
            ? "Order"
            : "Orders"}
        </span>
      </div>

      {orders.length ===
      0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-12 text-center">
          <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-neutral-400" />

          <p className="text-sm font-medium text-neutral-900">
            No purchase history yet
          </p>

          <p className="mb-6 mt-1 text-xs text-neutral-500">
            Explore our catalog and place your first order.
          </p>

          <Button
            onClick={() =>
              router.push(
                "/shop"
              )
            }
            className="cursor-pointer bg-pink-500 text-white hover:bg-pink-600"
          >
            Start Shopping
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(
            (
              order
            ) => {
              const orderReference =
                order.order_number ||
                order.id;

              const itemsCount =
                order.order_items?.reduce(
                  (
                    total,
                    item
                  ) =>
                    total +
                    Number(
                      item.quantity ??
                        0
                    ),
                  0
                ) ??
                0;

              return (
                <button
                  key={
                    order.id
                  }
                  type="button"
                  onClick={() =>
                    setSelectedOrder(
                      order
                    )
                  }
                  className="group flex w-full cursor-pointer flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-sm transition-all hover:border-pink-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-all font-mono text-xs font-bold text-neutral-900">
                        {
                          orderReference
                        }
                      </span>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getOrderStatusClasses(
                          order.order_status
                        )}`}
                      >
                        {formatStatus(
                          order.order_status
                        )}
                      </span>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getPaymentStatusClasses(
                          order.payment_status
                        )}`}
                      >
                        {formatStatus(
                          order.payment_status
                        )}
                      </span>

                      {order.refund_status &&
                      normalizeStatus(
                        order.refund_status
                      ) !==
                        "not_required" ? (
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getRefundStatusClasses(
                            order.refund_status
                          )}`}
                        >
                          Refund{" "}
                          {formatStatus(
                            order.refund_status
                          )}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />

                        {formatShortDate(
                          order.created_at
                        )}
                      </span>

                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />

                        {itemsCount}{" "}
                        {itemsCount ===
                        1
                          ? "item"
                          : "items"}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-5 sm:justify-end">
                    <div className="sm:text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Total
                      </p>

                      <p className="mt-0.5 font-mono text-sm font-black text-neutral-900">
                        {formatCurrency(
                          order.total
                        )}
                      </p>
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-pink-50 group-hover:text-pink-600">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </button>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}