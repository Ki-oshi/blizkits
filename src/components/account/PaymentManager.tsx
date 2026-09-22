"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Plus,
  Star,
  Trash2,
  Wallet,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

interface PaymentMethod {
  id: string;
  user_id: string;
  provider: string;
  account_name: string;
  account_number_masked: string;
  is_default: boolean | null;
  created_at?: string;
}

interface PaymentManagerProps {
  initialPaymentMethods?: PaymentMethod[];
}

const PROVIDERS = [
  "GCash",
  "Maya",
  "QR Ph",
  "GrabPay",
  "ShopeePay",
  "Credit Card",
] as const;

type Provider =
  (typeof PROVIDERS)[number];

/* =========================================================
   HELPERS
========================================================= */

function getProviderHint(
  provider: Provider
) {
  switch (provider) {
    case "GCash":
      return "Example: Personal GCash";

    case "Maya":
      return "Example: Personal Maya";

    case "GrabPay":
      return "Example: Main GrabPay";

    case "ShopeePay":
      return "Example: Main ShopeePay";

    case "QR Ph":
      return "Example: Preferred QR payment";

    case "Credit Card":
      return "Example: Personal Visa";

    default:
      return "Payment preference";
  }
}

function getMaskedHint(
  provider: Provider
) {
  if (
    provider ===
    "Credit Card"
  ) {
    return "Example: Card ending in 4242";
  }

  if (
    provider ===
    "QR Ph"
  ) {
    return "Example: Preferred bank / wallet";
  }

  return "Example: Account ending in 2090";
}

/* =========================================================
   COMPONENT
========================================================= */

export default function PaymentManager({
  initialPaymentMethods = [],
}: PaymentManagerProps) {
  const [
    paymentMethods,
    setPaymentMethods,
  ] =
    useState<PaymentMethod[]>(
      initialPaymentMethods
    );

  const [
    selectedProvider,
    setSelectedProvider,
  ] =
    useState<Provider>(
      "GCash"
    );

  const [
    isAdding,
    setIsAdding,
  ] = useState(false);

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    message,
    setMessage,
  ] =
    useState<{
      type:
        | "success"
        | "error";
      text: string;
    } | null>(null);

  /*
   * Keep one stable Supabase
   * browser client.
   */
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  /* =======================================================
     ADD PAYMENT PREFERENCE
  ======================================================= */

  const handleAddSubmit =
    async (
      e: React.FormEvent<HTMLFormElement>
    ) => {
      e.preventDefault();

      setMessage(null);

      const formData =
        new FormData(
          e.currentTarget
        );

      const provider =
        formData.get(
          "provider"
        ) as Provider;

      const accountName =
        String(
          formData.get(
            "accountName"
          ) ?? ""
        ).trim();

      const accountNumberMasked =
        String(
          formData.get(
            "accountNumberMasked"
          ) ?? ""
        ).trim();

      const requestedDefault =
        formData.get(
          "isDefault"
        ) === "on";

      /*
       * First preference becomes
       * default automatically.
       */
      const isDefault =
        paymentMethods.length ===
          0 ||
        requestedDefault;

      if (!accountName) {
        setMessage({
          type: "error",
          text:
            "Please provide a display name for this payment preference.",
        });

        return;
      }

      if (
        !accountNumberMasked
      ) {
        setMessage({
          type: "error",
          text:
            "Please provide a masked account hint or short reference.",
        });

        return;
      }

      /*
       * Prevent accidental storage
       * of an apparent full card
       * number.
       */
      const normalizedInput =
        accountNumberMasked.replace(
          /[\s-]/g,
          ""
        );

      const suspiciousFullCard =
        /^\d{12,19}$/.test(
          normalizedInput
        );

      if (
        suspiciousFullCard
      ) {
        setMessage({
          type: "error",
          text:
            "Do not enter a full card number. Only use a masked reference such as “Card ending in 4242”.",
        });

        return;
      }

      startTransition(
        async () => {
          try {
            const {
              data: {
                user,
              },
              error:
                authError,
            } =
              await supabase.auth.getUser();

            if (
              authError ||
              !user
            ) {
              setMessage({
                type:
                  "error",

                text:
                  "Your session has expired. Please sign in again.",
              });

              return;
            }

            /*
             * Clear current default
             * when necessary.
             */
            if (
              isDefault
            ) {
              const {
                error:
                  clearError,
              } =
                await supabase
                  .from(
                    "payment_methods"
                  )
                  .update({
                    is_default:
                      false,
                  })
                  .eq(
                    "user_id",
                    user.id
                  );

              if (
                clearError
              ) {
                throw clearError;
              }
            }

            /*
             * Insert preference.
             */
            const {
              data,
              error,
            } =
              await supabase
                .from(
                  "payment_methods"
                )
                .insert({
                  user_id:
                    user.id,

                  provider,

                  account_name:
                    accountName,

                  account_number_masked:
                    accountNumberMasked,

                  is_default:
                    isDefault,
                })
                .select()
                .single();

            if (
              error ||
              !data
            ) {
              throw (
                error ??
                new Error(
                  "Unable to save payment preference."
                )
              );
            }

            /*
             * Update local UI.
             */
            setPaymentMethods(
              (prev) => {
                const normalized =
                  isDefault
                    ? prev.map(
                        (
                          method
                        ) => ({
                          ...method,

                          is_default:
                            false,
                        })
                      )
                    : prev;

                return [
                  ...normalized,
                  data as PaymentMethod,
                ];
              }
            );

            setMessage({
              type:
                "success",

              text:
                isDefault
                  ? "Payment preference saved and set as your default."
                  : "Payment preference saved successfully.",
            });

            setIsAdding(
              false
            );

            setSelectedProvider(
              "GCash"
            );
          } catch (
            error
          ) {
            console.error(
              "Save payment preference error:",
              error
            );

            setMessage({
              type:
                "error",

              text:
                error instanceof Error
                  ? error.message
                  : "Unable to save payment preference.",
            });
          }
        }
      );
    };

  /* =======================================================
     SET DEFAULT
  ======================================================= */

  const handleSetDefault =
    async (
      id: string
    ) => {
      setMessage(null);

      startTransition(
        async () => {
          try {
            const {
              data: {
                user,
              },
              error:
                authError,
            } =
              await supabase.auth.getUser();

            if (
              authError ||
              !user
            ) {
              setMessage({
                type:
                  "error",

                text:
                  "Your session has expired. Please sign in again.",
              });

              return;
            }

            /*
             * Clear existing defaults.
             */
            const {
              error:
                clearError,
            } =
              await supabase
                .from(
                  "payment_methods"
                )
                .update({
                  is_default:
                    false,
                })
                .eq(
                  "user_id",
                  user.id
                );

            if (
              clearError
            ) {
              throw clearError;
            }

            /*
             * Set selected method
             * as default.
             */
            const {
              error:
                defaultError,
            } =
              await supabase
                .from(
                  "payment_methods"
                )
                .update({
                  is_default:
                    true,
                })
                .eq(
                  "id",
                  id
                )
                .eq(
                  "user_id",
                  user.id
                );

            if (
              defaultError
            ) {
              throw defaultError;
            }

            setPaymentMethods(
              (prev) =>
                prev.map(
                  (
                    method
                  ) => ({
                    ...method,

                    is_default:
                      method.id ===
                      id,
                  })
                )
            );

            setMessage({
              type:
                "success",

              text:
                "Default payment preference updated.",
            });
          } catch (
            error
          ) {
            console.error(
              "Set default payment error:",
              error
            );

            setMessage({
              type:
                "error",

              text:
                error instanceof Error
                  ? error.message
                  : "Unable to update your default payment preference.",
            });
          }
        }
      );
    };

  /* =======================================================
     DELETE
  ======================================================= */

  const handleDelete =
    async (
      id: string
    ) => {
      setMessage(null);

      startTransition(
        async () => {
          try {
            const {
              data: {
                user,
              },
              error:
                authError,
            } =
              await supabase.auth.getUser();

            if (
              authError ||
              !user
            ) {
              setMessage({
                type:
                  "error",

                text:
                  "Your session has expired. Please sign in again.",
              });

              return;
            }

            const method =
              paymentMethods.find(
                (
                  paymentMethod
                ) =>
                  paymentMethod.id ===
                  id
              );

            /*
             * Delete only if it
             * belongs to current user.
             */
            const {
              error,
            } =
              await supabase
                .from(
                  "payment_methods"
                )
                .delete()
                .eq(
                  "id",
                  id
                )
                .eq(
                  "user_id",
                  user.id
                );

            if (error) {
              throw error;
            }

            const remaining =
              paymentMethods.filter(
                (
                  paymentMethod
                ) =>
                  paymentMethod.id !==
                  id
              );

            /*
             * If the deleted method
             * was the default, make
             * the first remaining
             * preference default.
             */
            if (
              method?.is_default &&
              remaining.length >
                0
            ) {
              const nextDefault =
                remaining[0];

              const {
                error:
                  newDefaultError,
              } =
                await supabase
                  .from(
                    "payment_methods"
                  )
                  .update({
                    is_default:
                      true,
                  })
                  .eq(
                    "id",
                    nextDefault.id
                  )
                  .eq(
                    "user_id",
                    user.id
                  );

              if (
                newDefaultError
              ) {
                console.error(
                  "Unable to promote next default payment method:",
                  newDefaultError
                );
              } else {
                remaining[0] =
                  {
                    ...nextDefault,

                    is_default:
                      true,
                  };
              }
            }

            setPaymentMethods(
              remaining
            );

            setMessage({
              type:
                "success",

              text:
                "Payment preference removed.",
            });
          } catch (
            error
          ) {
            console.error(
              "Delete payment preference error:",
              error
            );

            setMessage({
              type:
                "error",

              text:
                error instanceof Error
                  ? error.message
                  : "Unable to remove payment preference.",
            });
          }
        }
      );
    };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="space-y-6">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 border-b border-neutral-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-neutral-900">
            Payment Preferences
          </h2>

          <p className="mt-1 max-w-xl text-xs leading-5 text-neutral-500">
            Manage your preferred
            payment methods for
            faster checkout. These
            are preferences only —
            wallet and card
            authorization is
            completed securely
            through PayMongo.
          </p>
        </div>

        {!isAdding && (
          <Button
            onClick={() => {
              setIsAdding(
                true
              );

              setMessage(
                null
              );
            }}
            size="sm"
            className="inline-flex h-10 w-auto min-w-[155px] shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full bg-neutral-900 px-5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4 shrink-0" />

            <span className="whitespace-nowrap">
              Add Preference
            </span>
          </Button>
        )}
      </div>

      {/* =================================================
          SECURITY NOTICE
      ================================================= */}

      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
        <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

        <div>
          <p className="text-xs font-bold text-blue-900">
            No financial
            credentials are
            stored here
          </p>

          <p className="mt-1 text-[11px] leading-5 text-blue-700">
            Never enter your
            complete card number,
            CVV, wallet PIN,
            password, OTP, or
            other sensitive
            payment information.
            BLIZKITS only stores
            your preferred payment
            option and a display
            hint.
          </p>
        </div>
      </div>

      {/* =================================================
          MESSAGES
      ================================================= */}

      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${
            message.type ===
            "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.type ===
          "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}

          <span>
            {
              message.text
            }
          </span>
        </div>
      )}

      {/* =================================================
          ADD PAYMENT PREFERENCE FORM
      ================================================= */}

      {isAdding && (
        <form
          onSubmit={
            handleAddSubmit
          }
          className="space-y-5 rounded-2xl border border-pink-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                New Payment
                Preference
              </h3>

              <p className="mt-1 text-[11px] leading-4 text-neutral-500">
                This controls
                which payment
                option is
                pre-selected
                during checkout.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsAdding(
                  false
                );

                setMessage(
                  null
                );
              }}
              className="shrink-0 cursor-pointer text-xs font-semibold text-neutral-500 transition hover:text-neutral-900"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Provider */}

            <div>
              <label
                htmlFor="provider"
                className="mb-1.5 block text-xs font-bold text-neutral-800"
              >
                Payment Method
              </label>

              <select
                id="provider"
                name="provider"
                required
                value={
                  selectedProvider
                }
                onChange={(
                  event
                ) =>
                  setSelectedProvider(
                    event.target
                      .value as Provider
                  )
                }
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              >
                {PROVIDERS.map(
                  (provider) => (
                    <option
                      key={
                        provider
                      }
                      value={
                        provider
                      }
                    >
                      {
                        provider
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Display Name */}

            <div>
              <label
                htmlFor="accountName"
                className="mb-1.5 block text-xs font-bold text-neutral-800"
              >
                Display Name
              </label>

              <input
                id="accountName"
                name="accountName"
                required
                placeholder={getProviderHint(
                  selectedProvider
                )}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              />

              <p className="mt-1 text-[10px] leading-4 text-neutral-400">
                A personal label
                so you can
                recognize this
                preference.
              </p>
            </div>
          </div>

          {/* Account Hint */}

          <div>
            <label
              htmlFor="accountNumberMasked"
              className="mb-1.5 block text-xs font-bold text-neutral-800"
            >
              Account Hint
            </label>

            <input
              id="accountNumberMasked"
              name="accountNumberMasked"
              required
              placeholder={getMaskedHint(
                selectedProvider
              )}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
            />

            <p className="mt-1 text-[10px] leading-4 text-neutral-400">
              Use only a masked
              or non-sensitive
              reference such as
              “ending in 2090”.
              Never enter a
              complete account or
              card number.
            </p>
          </div>

          {/* Default */}

          <div className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
            <input
              type="checkbox"
              id="isDefaultPayment"
              name="isDefault"
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-pink-500"
            />

            <label
              htmlFor="isDefaultPayment"
              className="cursor-pointer"
            >
              <span className="block text-xs font-bold text-neutral-800">
                Set as default
                payment preference
              </span>

              <span className="mt-1 block text-[10px] leading-4 text-neutral-500">
                BLIZKITS will
                automatically
                select this
                payment method
                when you open
                checkout. You can
                still choose
                another method for
                each order.
              </span>
            </label>
          </div>

          {/* Save */}

          <div className="pt-1">
            <Button
              type="submit"
              disabled={
                isPending
              }
              className="inline-flex min-w-[150px] cursor-pointer items-center justify-center rounded-full bg-pink-500 px-5 text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                ? "Saving..."
                : "Save Preference"}
            </Button>
          </div>
        </form>
      )}

      {/* =================================================
          PAYMENT PREFERENCE LIST
      ================================================= */}

      {paymentMethods.length ===
      0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-neutral-400 shadow-sm">
            <CreditCard className="h-6 w-6" />
          </div>

          <p className="text-sm font-bold text-neutral-900">
            No payment
            preferences saved
          </p>

          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-neutral-500">
            Add a preferred
            method such as GCash,
            Maya, QR Ph, GrabPay,
            ShopeePay, or card.
            You can still choose
            any available method
            directly during
            checkout.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {paymentMethods.map(
            (method) => (
              <div
                key={
                  method.id
                }
                className={`rounded-2xl border p-5 transition-all ${
                  method.is_default
                    ? "border-pink-500 bg-pink-50/20 shadow-sm"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  {/* Left */}

                  <div className="flex min-w-0 items-start gap-4">
                    {/* Icon */}

                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        method.is_default
                          ? "bg-pink-500 text-white"
                          : "bg-pink-50 text-pink-500"
                      }`}
                    >
                      {method.provider ===
                      "Credit Card" ? (
                        <CreditCard className="h-6 w-6" />
                      ) : (
                        <Wallet className="h-6 w-6" />
                      )}
                    </div>

                    {/* Details */}

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-neutral-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                          {
                            method.provider
                          }
                        </span>

                        {method.is_default && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-pink-100 bg-pink-50 px-2.5 py-1 text-[10px] font-bold text-pink-600">
                            <Star className="h-3 w-3 fill-pink-500" />

                            Default
                          </span>
                        )}
                      </div>

                      <p className="break-words pt-1 text-sm font-bold text-neutral-900">
                        {
                          method.account_name
                        }
                      </p>

                      <p className="break-words font-mono text-xs text-neutral-500">
                        {
                          method.account_number_masked
                        }
                      </p>

                      <p className="pt-1 text-[10px] leading-4 text-neutral-400">
                        Preference
                        only. Payment
                        authorization
                        is completed
                        securely at
                        checkout.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}

                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                    {!method.is_default && (
                      <button
                        type="button"
                        onClick={() =>
                          handleSetDefault(
                            method.id
                          )
                        }
                        disabled={
                          isPending
                        }
                        className="cursor-pointer whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-pink-50 hover:text-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Set Default
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          method.id
                        )
                      }
                      disabled={
                        isPending
                      }
                      className="cursor-pointer rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Remove payment preference"
                      aria-label={`Remove ${method.provider} payment preference`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}