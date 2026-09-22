"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";

import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import type {
  User as SupabaseUser,
} from "@supabase/supabase-js";

import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  updateProfile,
} from "@/app/actions/profile";

import PurchasesManager from "@/components/account/PurchasesManager";
import AddressManager from "@/components/account/AddressManager";
import PaymentManager from "@/components/account/PaymentManager";
import NotificationManager from "@/components/account/NotificationManager";
import SettingsManager from "@/components/account/SettingsManager";

import {
  User,
  Package,
  MapPin,
  CreditCard,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

/* =========================================================
   ACCOUNT PAGE CONTENT
========================================================= */

function AccountPageContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const initialTab =
    searchParams.get("tab") ||
    "profile";

  const urlMessage =
    searchParams.get("success") ||
    searchParams.get("message");

  /* =======================================================
     STATE
  ======================================================= */

  const [
    activeTab,
    setActiveTab,
  ] =
    useState(
      initialTab
    );

  const [
    user,
    setUser,
  ] =
    useState<SupabaseUser | null>(
      null
    );

  const [
    profile,
    setProfile,
  ] =
    useState<any>(
      null
    );

  const [
    orders,
    setOrders,
  ] =
    useState<any[]>(
      []
    );

  const [
    addresses,
    setAddresses,
  ] =
    useState<any[]>(
      []
    );

  const [
    paymentMethods,
    setPaymentMethods,
  ] =
    useState<any[]>(
      []
    );

  const [
    notifications,
    setNotifications,
  ] =
    useState<any>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    message,
    setMessage,
  ] =
    useState<{
      type:
        | "success"
        | "error";

      text:
        string;
    } | null>(
      urlMessage
        ? {
            type:
              "success",

            text:
              urlMessage,
          }
        : null
    );

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  /*
   * Keep one stable Supabase
   * browser client.
   */
  const [
    supabase,
  ] =
    useState(
      () =>
        createClient()
    );

  /* =======================================================
     CLEAR ACCOUNT DATA
  ======================================================= */

  const clearAccountData =
    useCallback(
      () => {
        setUser(
          null
        );

        setProfile(
          null
        );

        setOrders(
          []
        );

        setAddresses(
          []
        );

        setPaymentMethods(
          []
        );

        setNotifications(
          null
        );
      },
      []
    );

  /* =======================================================
     LOAD ACCOUNT DATA
  ======================================================= */

  const loadUserData =
    useCallback(
      async (
        authUser:
          | SupabaseUser
          | null
      ) => {
        /*
         * Never access .id
         * before checking user.
         */
        if (
          !authUser
        ) {
          clearAccountData();

          setLoading(
            false
          );

          return;
        }

        try {
          setLoading(
            true
          );

          /*
           * Store authenticated
           * user for UI.
           */
          setUser(
            authUser
          );

          /*
           * IMPORTANT:
           *
           * Use this authenticated
           * object directly.
           *
           * Do not use React's
           * `user` state here because
           * setUser() is asynchronous.
           */
          const userId =
            authUser.id;

          const [
            profileRes,
            ordersRes,
            addressRes,
            paymentRes,
            notifRes,
          ] =
            await Promise.all([
              /* =========================
                 PROFILE
              ========================= */

              supabase
                .from(
                  "profiles"
                )
                .select(
                  "*"
                )
                .eq(
                  "id",
                  userId
                )
                .maybeSingle(),

              /* =========================
                 ORDERS
              ========================= */

              supabase
                .from(
                  "orders"
                )
                .select(`
                  *,
                  order_items (
                    id,
                    order_id,
                    product_id,
                    variant_id,
                    product_name,
                    variant_name,
                    quantity,
                    unit_price,
                    subtotal
                  ),
                  payments (
                    id,
                    order_id,
                    provider,
                    transaction_id,
                    amount,
                    status,
                    created_at
                  )
                `)
                .eq(
                  "user_id",
                  userId
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                ),

              /* =========================
                 ADDRESSES
              ========================= */

              supabase
                .from(
                  "addresses"
                )
                .select(
                  "*"
                )
                .eq(
                  "user_id",
                  userId
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
                ),

              /* =========================
                 PAYMENT PREFERENCES
              ========================= */

              supabase
                .from(
                  "payment_methods"
                )
                .select(
                  "*"
                )
                .eq(
                  "user_id",
                  userId
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
                ),

              /* =========================
                 NOTIFICATIONS
              ========================= */

              supabase
                .from(
                  "user_notifications"
                )
                .select(
                  "*"
                )
                .eq(
                  "user_id",
                  userId
                )
                .maybeSingle(),
            ]);

          /* =============================
             QUERY ERRORS
          ============================= */

          if (
            profileRes.error
          ) {
            console.error(
              "Profile fetch error:",
              profileRes.error
            );
          }

          if (
            ordersRes.error
          ) {
            console.error(
              "Orders fetch error:",
              ordersRes.error
            );
          }

          if (
            addressRes.error
          ) {
            console.error(
              "Addresses fetch error:",
              addressRes.error
            );
          }

          if (
            paymentRes.error
          ) {
            console.error(
              "Payment methods fetch error:",
              paymentRes.error
            );
          }

          if (
            notifRes.error
          ) {
            console.error(
              "Notifications fetch error:",
              notifRes.error
            );
          }

          /* =============================
             UPDATE STATE
          ============================= */

          setProfile(
            profileRes.data ??
              null
          );

          setOrders(
            ordersRes.data ??
              []
          );

          setAddresses(
            addressRes.data ??
              []
          );

          setPaymentMethods(
            paymentRes.data ??
              []
          );

          setNotifications(
            notifRes.data ?? {
              order_updates:
                true,

              drop_alerts:
                true,

              promotions:
                true,
            }
          );
        } catch (
          error
        ) {
          console.error(
            "Failed to load account data:",
            error
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        supabase,
        clearAccountData,
      ]
    );

  /* =======================================================
     AUTHENTICATION
  ======================================================= */

  useEffect(
    () => {
      let mounted =
        true;

      async function initializeAuth() {
        try {
          /*
           * Read existing browser
           * session first.
           */
          const {
            data: {
              session,
            },
            error:
              sessionError,
          } =
            await supabase.auth.getSession();

          if (
            !mounted
          ) {
            return;
          }

          if (
            sessionError
          ) {
            console.error(
              "Session error:",
              sessionError
            );
          }

          /*
           * No session.
           */
          if (
            !session?.user
          ) {
            clearAccountData();

            setLoading(
              false
            );

            return;
          }

          /*
           * Verify session against
           * Supabase Auth.
           */
          const {
            data: {
              user:
                verifiedUser,
            },
            error:
              userError,
          } =
            await supabase.auth.getUser();

          if (
            !mounted
          ) {
            return;
          }

          if (
            userError ||
            !verifiedUser
          ) {
            if (
              userError
            ) {
              console.error(
                "User verification error:",
                userError
              );
            }

            clearAccountData();

            setLoading(
              false
            );

            return;
          }

          /*
           * Load account information
           * using verified auth user.
           */
          await loadUserData(
            verifiedUser
          );
        } catch (
          error
        ) {
          console.error(
            "Authentication initialization error:",
            error
          );

          if (
            mounted
          ) {
            clearAccountData();

            setLoading(
              false
            );
          }
        }
      }

      void initializeAuth();

      /*
       * Listen for login/logout/
       * refresh events.
       */
      const {
        data: {
          subscription,
        },
      } =
        supabase.auth.onAuthStateChange(
          (
            event,
            session
          ) => {
            if (
              !mounted
            ) {
              return;
            }

            /*
             * Signed out / expired
             * session.
             */
            if (
              event ===
                "SIGNED_OUT" ||
              !session?.user
            ) {
              clearAccountData();

              setLoading(
                false
              );

              router.refresh();

              return;
            }

            /*
             * Authenticated session
             * changed.
             */
            if (
              event ===
                "SIGNED_IN" ||
              event ===
                "USER_UPDATED" ||
              event ===
                "TOKEN_REFRESHED"
            ) {
              const currentUser =
                session.user;

              /*
               * Immediately update
               * user state.
               */
              setUser(
                currentUser
              );

              /*
               * Avoid heavy async
               * work directly inside
               * Supabase auth callback.
               */
              setTimeout(
                () => {
                  if (
                    !mounted
                  ) {
                    return;
                  }

                  void loadUserData(
                    currentUser
                  );

                  router.refresh();
                },
                0
              );
            }
          }
        );

      return () => {
        mounted =
          false;

        subscription.unsubscribe();
      };
    },
    [
      supabase,
      router,
      loadUserData,
      clearAccountData,
    ]
  );

  /* =======================================================
     URL TAB SYNC
  ======================================================= */

  useEffect(
    () => {
      const tab =
        searchParams.get(
          "tab"
        );

      if (
        tab
      ) {
        setActiveTab(
          tab
        );
      }
    },
    [
      searchParams,
    ]
  );

  /* =======================================================
     PROFILE UPDATE
  ======================================================= */

  const handleProfileUpdate =
    async (
      e: React.FormEvent<HTMLFormElement>
    ) => {
      e.preventDefault();

      setMessage(
        null
      );

      const formData =
        new FormData(
          e.currentTarget
        );

      startTransition(
        async () => {
          try {
            const res =
              await updateProfile(
                formData
              );

            if (
              res.error
            ) {
              setMessage({
                type:
                  "error",

                text:
                  res.error,
              });

              return;
            }

            setMessage({
              type:
                "success",

              text:
                res.success ||
                "Updated successfully!",
            });

            /*
             * Reload account after
             * profile update.
             */
            if (
              user
            ) {
              await loadUserData(
                user
              );
            }

            router.refresh();
          } catch (
            error
          ) {
            console.error(
              "Profile update error:",
              error
            );

            setMessage({
              type:
                "error",

              text:
                "Unable to update your profile.",
            });
          }
        }
      );
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-pink-500" />

          <p className="animate-pulse text-sm text-neutral-500">
            Loading account
            dashboard...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     NOT AUTHENTICATED
  ======================================================= */

  if (
    !user
  ) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center bg-white py-20 md:py-28">
        <Container className="max-w-md space-y-6 text-center">
          {/* Warning Icon */}

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-300 bg-orange-50 text-orange-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="8.5"
              />

              <path d="M12 7.5v5.5" />

              <circle
                cx="12"
                cy="16.5"
                r="1"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </div>

          {/* Text */}

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
              Account Access Required
            </h1>

            <p className="text-sm leading-6 text-neutral-500">
              Please sign in or create
              an account first to view
              your dashboard, check
              your order history, and
              manage your saved
              addresses.
            </p>
          </div>

          {/* Authentication Buttons */}

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/login?redirect=/account"
              className="flex-1"
            >
              <Button className="w-full cursor-pointer bg-pink-500 text-white hover:bg-pink-600">
                Sign In
              </Button>
            </Link>

            <Link
              href="/register?redirect=/account"
              className="flex-1"
            >
              <Button
                variant="outline"
                className="w-full cursor-pointer border-neutral-300 text-neutral-900 hover:bg-neutral-50"
              >
                Register
              </Button>
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  /* =======================================================
     AUTHENTICATED DASHBOARD
  ======================================================= */

  return (
    <div className="min-h-[85vh] bg-white py-12 md:py-16">
      <Container className="max-w-6xl">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8 flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl">
              My Account
            </h1>

            <p className="mt-1 text-sm font-medium text-neutral-600">
              Welcome back,{" "}
              <span className="text-pink-500">
                {profile?.full_name ||
                  user.email}
              </span>
            </p>
          </div>

          {/* Sign Out */}

          <form
            action="/auth/signout"
            method="POST"
          >
            <Button
              variant="outline"
              size="sm"
              className="flex cursor-pointer items-center gap-2 border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            >
              <LogOut className="h-4 w-4" />

              Sign Out
            </Button>
          </form>
        </div>

        {/* =================================================
            GLOBAL PROFILE MESSAGE
        ================================================= */}

        {message &&
          activeTab ===
            "profile" && (
            <div
              className={`mb-6 flex items-center gap-2 rounded-xl border p-4 text-sm ${
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
            DASHBOARD
        ================================================= */}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* ===============================================
              SIDEBAR
          =============================================== */}

          <aside className="lg:col-span-1">
            <nav className="flex flex-row gap-2 overflow-x-auto border-b border-neutral-200 pb-4 lg:flex-col lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
              {[
                {
                  id:
                    "profile",

                  label:
                    "My Profile",

                  icon:
                    User,
                },

                {
                  id:
                    "purchases",

                  label:
                    "My Purchases",

                  icon:
                    Package,
                },

                {
                  id:
                    "addresses",

                  label:
                    "Shipping Addresses",

                  icon:
                    MapPin,
                },

                {
                  id:
                    "payments",

                  label:
                    "Payment Preferences",

                  icon:
                    CreditCard,
                },

                {
                  id:
                    "notifications",

                  label:
                    "Notifications",

                  icon:
                    Bell,
                },

                {
                  id:
                    "settings",

                  label:
                    "Settings",

                  icon:
                    SettingsIcon,
                },
              ].map(
                (tab) => {
                  const Icon =
                    tab.icon;

                  const isActive =
                    activeTab ===
                    tab.id;

                  return (
                    <button
                      key={
                        tab.id
                      }
                      type="button"
                      onClick={() => {
                        setActiveTab(
                          tab.id
                        );

                        window.history.replaceState(
                          null,
                          "",
                          `/account?tab=${tab.id}`
                        );
                      }}
                      className={`flex cursor-pointer items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-pink-500 text-white shadow-sm shadow-pink-500/20"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />

                      {
                        tab.label
                      }
                    </button>
                  );
                }
              )}
            </nav>
          </aside>

          {/* ===============================================
              MAIN CONTENT
          =============================================== */}

          <main className="lg:col-span-3">
            {/* =============================================
                PROFILE
            ============================================= */}

            {activeTab ===
              "profile" && (
              <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">
                    Profile Information
                  </h2>

                  <p className="mt-1 text-xs text-neutral-500">
                    Update your personal
                    account details and
                    display name.
                  </p>
                </div>

                <form
                  onSubmit={
                    handleProfileUpdate
                  }
                  className="space-y-4"
                >
                  {/* Email */}

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Email Address
                    </label>

                    <input
                      type="email"
                      disabled
                      value={
                        user.email ||
                        ""
                      }
                      className="w-full cursor-not-allowed rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-sm text-neutral-500"
                    />

                    <span className="mt-1 block text-[11px] text-neutral-400">
                      Email address
                      cannot be changed.
                    </span>
                  </div>

                  {/* Full Name */}

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-700">
                      Full Name /
                      Username
                    </label>

                    <input
                      name="fullName"
                      defaultValue={
                        profile?.full_name ||
                        ""
                      }
                      required
                      placeholder="Enter your full name"
                      className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  {/* Phone */}

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-700">
                      Phone Number
                    </label>

                    <input
                      name="phone"
                      defaultValue={
                        profile?.phone ||
                        ""
                      }
                      placeholder="+63 912 345 6789"
                      className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  {/* Save */}

                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={
                        isPending
                      }
                      className="cursor-pointer bg-pink-500 text-white hover:bg-pink-600"
                    >
                      {isPending
                        ? "Saving changes..."
                        : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* =============================================
                PURCHASES
            ============================================= */}

            {activeTab ===
              "purchases" && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
                <PurchasesManager
                  initialOrders={
                    orders
                  }
                />
              </div>
            )}

            {/* =============================================
                ADDRESSES
            ============================================= */}

            {activeTab ===
              "addresses" && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
                <AddressManager
                  initialAddresses={
                    addresses
                  }
                />
              </div>
            )}

            {/* =============================================
                PAYMENT PREFERENCES
            ============================================= */}

            {activeTab ===
              "payments" && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
                <PaymentManager
                  initialPaymentMethods={
                    paymentMethods
                  }
                />
              </div>
            )}

            {/* =============================================
                NOTIFICATIONS
            ============================================= */}

            {activeTab ===
              "notifications" && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
                <NotificationManager
                  initialSettings={
                    notifications
                  }
                />
              </div>
            )}

            {/* =============================================
                SETTINGS
            ============================================= */}

            {activeTab ===
              "settings" && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
                <SettingsManager />
              </div>
            )}
          </main>
        </div>
      </Container>
    </div>
  );
}

/* =========================================================
   PAGE + SUSPENSE BOUNDARY
========================================================= */

/*
 * useSearchParams() is used inside
 * AccountPageContent.
 *
 * Next.js 16 requires that component
 * to be rendered below a Suspense
 * boundary during production build.
 */
export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-pink-500" />

            <p className="animate-pulse text-sm text-neutral-500">
              Loading account dashboard...
            </p>
          </div>
        </div>
      }
    >
      <AccountPageContent />
    </Suspense>
  );
}