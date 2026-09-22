"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type FormEvent,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  Check,
  CreditCard,
  Loader2,
  MapPin,
  Plus,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";

import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";

import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";

/* =========================================================
   TYPES
========================================================= */

type PaymentMethod =
  | "gcash"
  | "paymaya"
  | "grab_pay"
  | "shopeepay"
  | "qrph"
  | "card";

type DefaultAddressChoice =
  | "yes"
  | "no"
  | null;

interface SavedAddress {
  id: string;
  user_id: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean | null;
  created_at: string;
}

interface CustomAddress {
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
}

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: ElementType;
}

/* =========================================================
   PAYMENT METHODS
========================================================= */

const paymentMethods: PaymentMethodOption[] = [
  {
    id: "gcash",
    name: "GCash",
    description: "Pay securely using your GCash wallet.",
    icon: Smartphone,
  },
  {
    id: "paymaya",
    name: "Maya",
    description: "Pay through your Maya wallet.",
    icon: Wallet,
  },
  {
    id: "qrph",
    name: "QR Ph",
    description:
      "Scan using a supported bank or e-wallet application.",
    icon: QrCode,
  },
  {
    id: "grab_pay",
    name: "GrabPay",
    description: "Pay using your GrabPay wallet.",
    icon: Smartphone,
  },
  {
    id: "shopeepay",
    name: "ShopeePay",
    description: "Pay using your ShopeePay wallet.",
    icon: Wallet,
  },
  {
    id: "card",
    name: "Credit / Debit Card",
    description: "Pay securely using Visa or Mastercard.",
    icon: CreditCard,
  },
];

/* =========================================================
   HELPERS
========================================================= */

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

/* =========================================================
   PAGE
========================================================= */

export default function CheckoutPage() {
  const {
    cart,
    selectedIds,
    selectedItemsCount,
  } = useCart();

  /*
   * Stable Supabase browser client.
   */
  const supabase = useMemo(
    () => createClient(),
    []
  );

  /* =======================================================
     STATE
  ======================================================= */

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("gcash");

  const [email, setEmail] =
    useState("");

  const [userId, setUserId] =
    useState<string | null>(null);

  const [addresses, setAddresses] =
    useState<SavedAddress[]>([]);

  const [
    selectedAddressId,
    setSelectedAddressId,
  ] =
    useState<
      string | "custom" | null
    >(null);

  const [
    hasDefaultAddress,
    setHasDefaultAddress,
  ] = useState(false);

  const [
    defaultAddressChoice,
    setDefaultAddressChoice,
  ] =
    useState<DefaultAddressChoice>(
      null
    );

  const [
    customAddress,
    setCustomAddress,
  ] =
    useState<CustomAddress>({
      recipientName: "",
      phone: "",
      addressLine: "",
      city: "",
      province: "",
      postalCode: "",
    });

  const [isMounted, setIsMounted] =
    useState(false);

  const [
    isAddressLoading,
    setIsAddressLoading,
  ] = useState(true);

  const [
    isSavingAddress,
    setIsSavingAddress,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* =======================================================
     CART
  ======================================================= */

  const checkoutItems = useMemo(
    () =>
      cart.filter((item) =>
        selectedIds.includes(
          item.id
        )
      ),
    [
      cart,
      selectedIds,
    ]
  );

  const subtotal = useMemo(
    () =>
      checkoutItems.reduce(
        (sum, item) =>
          sum +
          item.price *
            item.quantity,
        0
      ),
    [checkoutItems]
  );

  /*
   * Temporary.
   * Replace when shipping rates
   * are implemented.
   */
  const shippingFee = 0;

  const total =
    subtotal + shippingFee;

  /* =======================================================
     SELECTED ADDRESS
  ======================================================= */

  const selectedSavedAddress =
    useMemo(() => {
      if (
        !selectedAddressId ||
        selectedAddressId ===
          "custom"
      ) {
        return null;
      }

      return (
        addresses.find(
          (address) =>
            address.id ===
            selectedAddressId
        ) ?? null
      );
    }, [
      addresses,
      selectedAddressId,
    ]);

  /*
   * Used to show the "Make default?"
   * prompt only AFTER every required
   * custom-address field is filled.
   */
  const customAddressComplete =
    useMemo(() => {
      return Boolean(
        customAddress.recipientName.trim() &&
          customAddress.phone.trim() &&
          customAddress.addressLine.trim() &&
          customAddress.city.trim() &&
          customAddress.province.trim() &&
          customAddress.postalCode.trim()
      );
    }, [customAddress]);

  /*
   * Ask about setting a default address
   * ONLY when the user currently does
   * not have one.
   */
  const shouldAskDefault =
    !hasDefaultAddress &&
    Boolean(
      selectedSavedAddress ||
        (
          selectedAddressId ===
            "custom" &&
          customAddressComplete
        )
    );

  /* =======================================================
     HYDRATION
  ======================================================= */

  useEffect(() => {
    setIsMounted(true);
  }, []);

  /* =======================================================
     LOAD USER + SAVED ADDRESSES
  ======================================================= */

  useEffect(() => {
    let active = true;

    async function loadCheckoutData() {
      try {
        setIsAddressLoading(true);
        setError(null);

        /*
         * Get current authenticated user.
         */
        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (!active) {
          return;
        }

        if (
          userError ||
          !user
        ) {
          window.location.href =
            `/login?redirect=${encodeURIComponent(
              "/checkout"
            )}&message=${encodeURIComponent(
              "Please sign in before checking out."
            )}`;

          return;
        }

        setUserId(user.id);

        setEmail(
          user.email ?? ""
        );

        /*
         * Load all addresses owned by
         * the authenticated account.
         *
         * Default first.
         * Newest second.
         */
        const {
          data,
          error:
            addressError,
        } =
          await supabase
            .from("addresses")
            .select(
              `
                id,
                user_id,
                recipient_name,
                phone,
                address_line,
                city,
                province,
                postal_code,
                is_default,
                created_at
              `
            )
            .eq(
              "user_id",
              user.id
            )
            .order(
              "is_default",
              {
                ascending:
                  false,
              }
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );

        if (!active) {
          return;
        }

        if (addressError) {
          console.error(
            "Address load error:",
            addressError
          );

          setAddresses([]);

          setSelectedAddressId(
            "custom"
          );

          setHasDefaultAddress(
            false
          );

          setError(
            "We couldn't load your saved addresses. You may enter another delivery address."
          );

          return;
        }

        const savedAddresses =
          (data ??
            []) as SavedAddress[];

        setAddresses(
          savedAddresses
        );

        /*
         * Find actual account default.
         */
        const defaultAddress =
          savedAddresses.find(
            (address) =>
              address.is_default ===
              true
          ) ?? null;

        /*
         * CASE 1:
         * Default address exists.
         *
         * Automatically select it.
         */
        if (defaultAddress) {
          setHasDefaultAddress(
            true
          );

          setSelectedAddressId(
            defaultAddress.id
          );

          setDefaultAddressChoice(
            null
          );

          return;
        }

        /*
         * CASE 2:
         * Saved addresses exist,
         * but NONE are marked default.
         *
         * Select the first one,
         * then ask if they want it
         * to become default.
         */
        if (
          savedAddresses.length >
          0
        ) {
          setHasDefaultAddress(
            false
          );

          setSelectedAddressId(
            savedAddresses[0].id
          );

          setDefaultAddressChoice(
            null
          );

          return;
        }

        /*
         * CASE 3:
         * No saved addresses.
         *
         * Immediately show the
         * custom-address form.
         */
        setHasDefaultAddress(
          false
        );

        setSelectedAddressId(
          "custom"
        );

        setDefaultAddressChoice(
          null
        );
      } catch (err) {
        console.error(
          "Checkout initialization error:",
          err
        );

        if (active) {
          setSelectedAddressId(
            "custom"
          );

          setHasDefaultAddress(
            false
          );

          setError(
            "Unable to load checkout information."
          );
        }
      } finally {
        if (active) {
          setIsAddressLoading(
            false
          );
        }
      }
    }

    void loadCheckoutData();

    return () => {
      active = false;
    };
  }, [supabase]);

  /* =======================================================
     CUSTOM ADDRESS UPDATE
  ======================================================= */

  const updateCustomAddress = (
    field: keyof CustomAddress,
    value: string
  ) => {
    setCustomAddress(
      (prev) => ({
        ...prev,
        [field]: value,
      })
    );

    /*
     * If the user edits the address
     * after answering Yes/No,
     * ask again for the FINAL address.
     */
    if (
      !hasDefaultAddress
    ) {
      setDefaultAddressChoice(
        null
      );
    }
  };

  /* =======================================================
     SAVE / SET DEFAULT ADDRESS
  ======================================================= */

  const saveDefaultAddress =
    async (): Promise<
      string | null
    > => {
      if (!userId) {
        throw new Error(
          "Unable to identify your account."
        );
      }

      setIsSavingAddress(
        true
      );

      try {
        /*
         * =================================================
         * EXISTING SAVED ADDRESS
         * =================================================
         */
        if (
          selectedSavedAddress
        ) {
          /*
           * Remove previous defaults
           * for safety.
           */
          const {
            error:
              clearDefaultError,
          } =
            await supabase
              .from(
                "addresses"
              )
              .update({
                is_default:
                  false,
              })
              .eq(
                "user_id",
                userId
              );

          if (
            clearDefaultError
          ) {
            throw clearDefaultError;
          }

          /*
           * Set selected saved
           * address as default.
           */
          const {
            error:
              updateError,
          } =
            await supabase
              .from(
                "addresses"
              )
              .update({
                is_default:
                  true,
              })
              .eq(
                "id",
                selectedSavedAddress.id
              )
              .eq(
                "user_id",
                userId
              );

          if (updateError) {
            throw updateError;
          }

          setAddresses(
            (prev) =>
              prev.map(
                (address) => ({
                  ...address,

                  is_default:
                    address.id ===
                    selectedSavedAddress.id,
                })
              )
          );

          setHasDefaultAddress(
            true
          );

          return selectedSavedAddress.id;
        }

        /*
         * =================================================
         * NEW CUSTOM ADDRESS
         * =================================================
         */
        if (
          selectedAddressId ===
            "custom" &&
          customAddressComplete
        ) {
          /*
           * Clear defaults for safety.
           */
          const {
            error:
              clearDefaultError,
          } =
            await supabase
              .from(
                "addresses"
              )
              .update({
                is_default:
                  false,
              })
              .eq(
                "user_id",
                userId
              );

          if (
            clearDefaultError
          ) {
            throw clearDefaultError;
          }

          /*
           * Insert the new address
           * as default.
           */
          const {
            data:
              newAddress,
            error:
              insertError,
          } =
            await supabase
              .from(
                "addresses"
              )
              .insert({
                user_id:
                  userId,

                recipient_name:
                  customAddress.recipientName.trim(),

                phone:
                  customAddress.phone.trim(),

                address_line:
                  customAddress.addressLine.trim(),

                city:
                  customAddress.city.trim(),

                province:
                  customAddress.province.trim(),

                postal_code:
                  customAddress.postalCode.trim(),

                is_default:
                  true,
              })
              .select(
                `
                  id,
                  user_id,
                  recipient_name,
                  phone,
                  address_line,
                  city,
                  province,
                  postal_code,
                  is_default,
                  created_at
                `
              )
              .single();

          if (
            insertError ||
            !newAddress
          ) {
            throw (
              insertError ??
              new Error(
                "Unable to save the address."
              )
            );
          }

          const savedAddress =
            newAddress as SavedAddress;

          setAddresses(
            (prev) => [
              savedAddress,

              ...prev.map(
                (address) => ({
                  ...address,
                  is_default:
                    false,
                })
              ),
            ]
          );

          setSelectedAddressId(
            savedAddress.id
          );

          setHasDefaultAddress(
            true
          );

          return savedAddress.id;
        }

        return null;
      } finally {
        setIsSavingAddress(
          false
        );
      }
    };

  /* =======================================================
     CHECKOUT
  ======================================================= */

  const handleCheckout =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        isLoading ||
        isSavingAddress
      ) {
        return;
      }

      setError(null);

      /*
       * Validate cart.
       */
      if (
        checkoutItems.length ===
        0
      ) {
        setError(
          "Please select at least one item before proceeding to checkout."
        );

        return;
      }

      /*
       * Build address object.
       */
      let checkoutAddress:
        | {
            addressId?: string;
            recipientName: string;
            phone: string;
            addressLine: string;
            city: string;
            province: string;
            postalCode: string;
          }
        | null = null;

      /*
       * Saved address.
       */
      if (
        selectedSavedAddress
      ) {
        checkoutAddress = {
          addressId:
            selectedSavedAddress.id,

          recipientName:
            selectedSavedAddress.recipient_name,

          phone:
            selectedSavedAddress.phone,

          addressLine:
            selectedSavedAddress.address_line,

          city:
            selectedSavedAddress.city,

          province:
            selectedSavedAddress.province,

          postalCode:
            selectedSavedAddress.postal_code,
        };
      }

      /*
       * Custom address.
       */
      if (
        selectedAddressId ===
        "custom"
      ) {
        if (
          !customAddressComplete
        ) {
          setError(
            "Please complete all required delivery address fields."
          );

          return;
        }

        checkoutAddress = {
          recipientName:
            customAddress.recipientName.trim(),

          phone:
            customAddress.phone.trim(),

          addressLine:
            customAddress.addressLine.trim(),

          city:
            customAddress.city.trim(),

          province:
            customAddress.province.trim(),

          postalCode:
            customAddress.postalCode.trim(),
        };
      }

      if (!checkoutAddress) {
        setError(
          "Please choose a delivery address."
        );

        return;
      }

      /*
       * If the user currently has
       * NO default address,
       * require Yes / No first.
       */
      if (
        shouldAskDefault &&
        defaultAddressChoice ===
          null
      ) {
        setError(
          "Please choose whether you want to make this your default delivery address."
        );

        return;
      }

      setIsLoading(true);

      try {
        /*
         * If they chose YES,
         * save/update the address
         * BEFORE PayMongo checkout.
         */
        if (
          !hasDefaultAddress &&
          defaultAddressChoice ===
            "yes"
        ) {
          const savedAddressId =
            await saveDefaultAddress();

          /*
           * Custom address may have
           * just been inserted.
           */
          if (
            savedAddressId
          ) {
            checkoutAddress.addressId =
              savedAddressId;
          }
        }

        /*
         * Only product IDs and
         * quantities are sent.
         *
         * Server loads trusted
         * prices from Supabase.
         */
        const items =
          checkoutItems.map(
            (item) => ({
              id: item.id,
              quantity:
                item.quantity,
            })
          );

        const response =
          await fetch(
            "/api/paymongo/checkout",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  items,

                  paymentMethod,

                  customer: {
                    email,

                    ...checkoutAddress,
                  },
                }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          if (
            response.status ===
            401
          ) {
            window.location.href =
              `/login?redirect=${encodeURIComponent(
                "/checkout"
              )}&message=${encodeURIComponent(
                "Please sign in before checking out."
              )}`;

            return;
          }

          throw new Error(
            data.error ||
              "Unable to start checkout."
          );
        }

        if (
          !data.checkoutUrl
        ) {
          throw new Error(
            "PayMongo did not return a checkout URL."
          );
        }

        /*
         * Redirect to PayMongo.
         */
        window.location.assign(
          data.checkoutUrl
        );
      } catch (err) {
        console.error(
          "Checkout error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
        );

        setIsLoading(false);
      }
    };

  /* =======================================================
     INITIAL LOADING
  ======================================================= */

  if (!isMounted) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin text-pink-500" />

          Loading checkout...
        </div>
      </div>
    );
  }

  /* =======================================================
     EMPTY CHECKOUT
  ======================================================= */

  if (
    cart.length === 0 ||
    checkoutItems.length ===
      0
  ) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center bg-white px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
            <CreditCard className="h-7 w-7" />
          </div>

          <h1 className="mt-6 text-2xl font-black text-neutral-900">
            Nothing to checkout
          </h1>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Select at least one
            product from your cart
            before proceeding to
            checkout.
          </p>

          <Link
            href="/cart"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-pink-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-pink-600"
          >
            <ArrowLeft className="h-4 w-4" />

            Return to Cart
          </Link>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="min-h-screen bg-neutral-50 py-10 md:py-14">
      <Container className="max-w-7xl">
        {/* Header */}

        <div className="mb-8">
          <Link
            href="/cart"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 transition hover:text-pink-500"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to Cart
          </Link>

          <h1 className="text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl">
            Checkout
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Confirm your delivery
            address and choose your
            preferred payment method.
          </p>
        </div>

        <form
          onSubmit={
            handleCheckout
          }
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* =================================================
                LEFT
            ================================================= */}

            <div className="space-y-6 lg:col-span-2">
              {/* ===============================================
                  DELIVERY ADDRESS
              =============================================== */}

              <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-500">
                      <MapPin className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="font-bold text-neutral-900">
                        Delivery
                        Address
                      </h2>

                      <p className="text-xs text-neutral-500">
                        Your default
                        address is
                        selected
                        automatically.
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/account?tab=addresses"
                    className="text-xs font-bold text-pink-500 transition hover:text-pink-600"
                  >
                    Manage Addresses
                  </Link>
                </div>

                {/* Loading addresses */}

                {isAddressLoading ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-5 text-sm text-neutral-500">
                    <Loader2 className="h-4 w-4 animate-spin text-pink-500" />

                    Loading saved
                    addresses...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* =========================================
                        SAVED ADDRESSES
                    ========================================= */}

                    {addresses.map(
                      (address) => {
                        const active =
                          selectedAddressId ===
                          address.id;

                        return (
                          <button
                            key={
                              address.id
                            }
                            type="button"
                            onClick={() => {
                              setSelectedAddressId(
                                address.id
                              );

                              setDefaultAddressChoice(
                                null
                              );

                              setError(
                                null
                              );
                            }}
                            className={`relative w-full cursor-pointer rounded-2xl border p-5 text-left transition ${
                              active
                                ? "border-pink-500 bg-pink-50/40 ring-1 ring-pink-500"
                                : "border-neutral-200 bg-white hover:border-neutral-300"
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              {/* Radio */}

                              <div
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                  active
                                    ? "border-pink-500 bg-pink-500 text-white"
                                    : "border-neutral-300 bg-white"
                                }`}
                              >
                                {active && (
                                  <Check className="h-3 w-3" />
                                )}
                              </div>

                              {/* Address */}

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-bold text-neutral-900">
                                    {
                                      address.recipient_name
                                    }
                                  </p>

                                  {address.is_default && (
                                    <span className="rounded-full bg-pink-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-pink-600">
                                      Default
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1 text-sm text-neutral-600">
                                  {
                                    address.phone
                                  }
                                </p>

                                <p className="mt-2 text-sm leading-6 text-neutral-500">
                                  {
                                    address.address_line
                                  }
                                  ,{" "}
                                  {
                                    address.city
                                  }
                                  ,{" "}
                                  {
                                    address.province
                                  }{" "}
                                  {
                                    address.postal_code
                                  }
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      }
                    )}

                    {/* =========================================
                        USE DIFFERENT ADDRESS
                    ========================================= */}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAddressId(
                          "custom"
                        );

                        setDefaultAddressChoice(
                          null
                        );

                        setError(
                          null
                        );
                      }}
                      className={`relative w-full cursor-pointer rounded-2xl border p-5 text-left transition ${
                        selectedAddressId ===
                        "custom"
                          ? "border-pink-500 bg-pink-50/40 ring-1 ring-pink-500"
                          : "border-dashed border-neutral-300 bg-neutral-50/50 hover:border-pink-300"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            selectedAddressId ===
                            "custom"
                              ? "bg-pink-500 text-white"
                              : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          <Plus className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-neutral-900">
                            Use a
                            different
                            address
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            Enter another
                            delivery
                            address for
                            this order.
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* =========================================
                        CUSTOM ADDRESS FORM
                    ========================================= */}

                    {selectedAddressId ===
                      "custom" && (
                      <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
                        <div className="mb-5">
                          <h3 className="text-sm font-bold text-neutral-900">
                            Delivery
                            Information
                          </h3>

                          <p className="mt-1 text-xs text-neutral-500">
                            Enter the
                            address where
                            you want this
                            order
                            delivered.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {/* Recipient */}

                          <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-600">
                              Recipient
                              Name
                            </label>

                            <input
                              required
                              value={
                                customAddress.recipientName
                              }
                              onChange={(
                                e
                              ) =>
                                updateCustomAddress(
                                  "recipientName",
                                  e.target
                                    .value
                                )
                              }
                              placeholder="Juan Dela Cruz"
                              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                            />
                          </div>

                          {/* Phone */}

                          <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-600">
                              Phone Number
                            </label>

                            <input
                              required
                              type="tel"
                              value={
                                customAddress.phone
                              }
                              onChange={(
                                e
                              ) =>
                                updateCustomAddress(
                                  "phone",
                                  e.target
                                    .value
                                )
                              }
                              placeholder="09123456789"
                              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                            />
                          </div>

                          {/* Postal */}

                          <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-600">
                              Postal Code
                            </label>

                            <input
                              required
                              inputMode="numeric"
                              value={
                                customAddress.postalCode
                              }
                              onChange={(
                                e
                              ) =>
                                updateCustomAddress(
                                  "postalCode",
                                  e.target
                                    .value
                                )
                              }
                              placeholder="1800"
                              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                            />
                          </div>

                          {/* Address */}

                          <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-600">
                              Complete
                              Address
                            </label>

                            <input
                              required
                              value={
                                customAddress.addressLine
                              }
                              onChange={(
                                e
                              ) =>
                                updateCustomAddress(
                                  "addressLine",
                                  e.target
                                    .value
                                )
                              }
                              placeholder="House number, street, subdivision, barangay"
                              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                            />
                          </div>

                          {/* City */}

                          <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-600">
                              City /
                              Municipality
                            </label>

                            <input
                              required
                              value={
                                customAddress.city
                              }
                              onChange={(
                                e
                              ) =>
                                updateCustomAddress(
                                  "city",
                                  e.target
                                    .value
                                )
                              }
                              placeholder="City"
                              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                            />
                          </div>

                          {/* Province */}

                          <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-600">
                              Province
                            </label>

                            <input
                              required
                              value={
                                customAddress.province
                              }
                              onChange={(
                                e
                              ) =>
                                updateCustomAddress(
                                  "province",
                                  e.target
                                    .value
                                )
                              }
                              placeholder="Province"
                              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* =========================================
                        MAKE DEFAULT PROMPT
                    ========================================= */}

                    {shouldAskDefault && (
                      <div className="mt-5 rounded-2xl border border-pink-200 bg-pink-50/60 p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-pink-500">
                            <MapPin className="h-5 w-5" />
                          </div>

                          <div className="flex-1">
                            <p className="text-sm font-bold text-neutral-900">
                              Make this
                              your default
                              address?
                            </p>

                            <p className="mt-1 text-xs leading-5 text-neutral-500">
                              You currently
                              don&apos;t
                              have a
                              default
                              delivery
                              address.
                              Would you
                              like
                              BLIZKITS to
                              automatically
                              use this
                              address for
                              future
                              orders?
                            </p>

                            <div className="mt-4 flex flex-wrap gap-3">
                              {/* Yes */}

                              <button
                                type="button"
                                onClick={() => {
                                  setDefaultAddressChoice(
                                    "yes"
                                  );

                                  setError(
                                    null
                                  );
                                }}
                                className={`cursor-pointer rounded-full border px-5 py-2.5 text-xs font-bold transition ${
                                  defaultAddressChoice ===
                                  "yes"
                                    ? "border-pink-500 bg-pink-500 text-white"
                                    : "border-neutral-300 bg-white text-neutral-700 hover:border-pink-400"
                                }`}
                              >
                                Yes, make it
                                default
                              </button>

                              {/* No */}

                              <button
                                type="button"
                                onClick={() => {
                                  setDefaultAddressChoice(
                                    "no"
                                  );

                                  setError(
                                    null
                                  );
                                }}
                                className={`cursor-pointer rounded-full border px-5 py-2.5 text-xs font-bold transition ${
                                  defaultAddressChoice ===
                                  "no"
                                    ? "border-neutral-900 bg-neutral-900 text-white"
                                    : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                                }`}
                              >
                                No, just this
                                order
                              </button>
                            </div>

                            {defaultAddressChoice ===
                              "yes" && (
                              <p className="mt-3 text-[11px] font-medium text-pink-600">
                                This
                                address will
                                be saved as
                                your default
                                delivery
                                address.
                              </p>
                            )}

                            {defaultAddressChoice ===
                              "no" && (
                              <p className="mt-3 text-[11px] text-neutral-500">
                                Your account
                                will remain
                                without a
                                default
                                address.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* =============================================
                    RECEIPT EMAIL
                ============================================= */}

                <div className="mt-6 border-t border-neutral-100 pt-5">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-600">
                    Receipt Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm text-neutral-500"
                  />

                  <p className="mt-1.5 text-[11px] text-neutral-400">
                    Payment and
                    order updates
                    will be sent
                    to your
                    account email.
                  </p>
                </div>
              </section>

              {/* ===============================================
                  PAYMENT
              =============================================== */}

              <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6">
                  <h2 className="font-bold text-neutral-900">
                    Payment Method
                  </h2>

                  <p className="mt-1 text-xs text-neutral-500">
                    Select how you
                    would like to
                    pay for your
                    order.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {paymentMethods.map(
                    (method) => {
                      const Icon =
                        method.icon;

                      const active =
                        paymentMethod ===
                        method.id;

                      return (
                        <button
                          key={
                            method.id
                          }
                          type="button"
                          onClick={() =>
                            setPaymentMethod(
                              method.id
                            )
                          }
                          className={`relative flex cursor-pointer items-start gap-4 rounded-2xl border p-4 text-left transition ${
                            active
                              ? "border-pink-500 bg-pink-50/50 ring-1 ring-pink-500"
                              : "border-neutral-200 bg-white hover:border-neutral-300"
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              active
                                ? "bg-pink-500 text-white"
                                : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="pr-5">
                            <p className="text-sm font-bold text-neutral-900">
                              {
                                method.name
                              }
                            </p>

                            <p className="mt-1 text-xs leading-5 text-neutral-500">
                              {
                                method.description
                              }
                            </p>
                          </div>

                          {active && (
                            <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-white">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-xl bg-neutral-50 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                  <p className="text-xs leading-5 text-neutral-500">
                    Payment
                    authorization
                    is completed
                    securely
                    through
                    PayMongo.
                    BLIZKITS does
                    not directly
                    collect your
                    GCash PIN,
                    wallet
                    password, or
                    card
                    credentials.
                  </p>
                </div>
              </section>
            </div>

            {/* =================================================
                ORDER SUMMARY
            ================================================= */}

            <aside className="lg:col-span-1">
              <div className="sticky top-24 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-black text-neutral-900">
                  Order Summary
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  {
                    selectedItemsCount
                  }{" "}
                  item
                  {selectedItemsCount !==
                  1
                    ? "s"
                    : ""}
                </p>

                {/* Products */}

                <div className="my-6 max-h-[320px] space-y-4 overflow-y-auto pr-1">
                  {checkoutItems.map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        className="flex gap-3"
                      >
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                          <img
                            src={
                              item.image_url ||
                              "/placeholder.jpg"
                            }
                            alt={
                              item.name
                            }
                            className="h-full w-full object-cover"
                          />

                          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-bold text-white">
                            {
                              item.quantity
                            }
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold text-neutral-900">
                            {
                              item.name
                            }
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            {formatCurrency(
                              item.price
                            )}{" "}
                            ×{" "}
                            {
                              item.quantity
                            }
                          </p>
                        </div>

                        <p className="text-sm font-bold text-neutral-900">
                          {formatCurrency(
                            item.price *
                              item.quantity
                          )}
                        </p>
                      </div>
                    )
                  )}
                </div>

                {/* Totals */}

                <div className="space-y-3 border-t border-neutral-100 pt-5 text-sm">
                  <div className="flex justify-between text-neutral-600">
                    <span>
                      Subtotal
                    </span>

                    <span>
                      {formatCurrency(
                        subtotal
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-neutral-600">
                    <span>
                      Shipping
                    </span>

                    <span>
                      {shippingFee ===
                      0
                        ? "Free"
                        : formatCurrency(
                            shippingFee
                          )}
                    </span>
                  </div>

                  <div className="flex items-end justify-between border-t border-neutral-100 pt-4">
                    <div>
                      <p className="font-bold text-neutral-900">
                        Total
                      </p>

                      <p className="text-[10px] text-neutral-400">
                        PHP
                      </p>
                    </div>

                    <span className="text-2xl font-black text-neutral-900">
                      {formatCurrency(
                        total
                      )}
                    </span>
                  </div>
                </div>

                {/* Error */}

                {error && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium leading-5 text-red-700">
                    {error}
                  </div>
                )}

                {/* Pay */}

                <Button
                  type="submit"
                  size="lg"
                  disabled={
                    isLoading ||
                    isAddressLoading ||
                    isSavingAddress
                  }
                  className="mt-6 w-full cursor-pointer bg-pink-500 py-3.5 font-bold text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingAddress ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />

                      Saving
                      address...
                    </span>
                  ) : isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />

                      Redirecting to
                      PayMongo...
                    </span>
                  ) : (
                    <>
                      Pay{" "}
                      {formatCurrency(
                        total
                      )}
                    </>
                  )}
                </Button>

                <p className="mt-4 text-center text-[10px] leading-4 text-neutral-400">
                  By continuing,
                  you will be
                  redirected to
                  PayMongo to
                  securely
                  authorize your
                  payment.
                </p>
              </div>
            </aside>
          </div>
        </form>
      </Container>
    </div>
  );
}