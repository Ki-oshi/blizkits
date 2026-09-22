"use client";

import {
  Suspense,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

import {
  AlertCircle,
  UserPlus,
} from "lucide-react";

/* =========================================================
   REGISTER CONTENT
========================================================= */

function RegisterPageContent() {
  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const searchParams =
    useSearchParams();

  const redirectParam =
    searchParams.get("redirect");

  /*
   * Prevent open redirects.
   *
   * Only allow local URLs.
   */
  const redirectTo =
    redirectParam?.startsWith("/") &&
    !redirectParam.startsWith("//")
      ? redirectParam
      : "/account";

  /*
   * Keep one stable Supabase
   * browser client.
   */
  const supabase = useMemo(
    () => createClient(),
    []
  );

  /* =======================================================
     REGISTER
  ======================================================= */

  const handleRegister = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const cleanName =
        fullName.trim();

      const cleanEmail =
        email.trim();

      if (!cleanName) {
        setError(
          "Please enter your full name."
        );

        return;
      }

      if (!cleanEmail) {
        setError(
          "Please enter your email address."
        );

        return;
      }

      if (password.length < 6) {
        setError(
          "Password must be at least 6 characters long."
        );

        return;
      }

      /*
       * Create Supabase account.
       */
      const {
        data,
        error: signUpError,
      } =
        await supabase.auth.signUp({
          email: cleanEmail,

          password,

          options: {
            data: {
              full_name:
                cleanName,
            },
          },
        });

      if (signUpError) {
        setError(
          signUpError.message
        );

        return;
      }

      if (!data.user) {
        setError(
          "Unable to create your account. Please try again."
        );

        return;
      }

      /*
       * CASE 1:
       * Supabase automatically
       * signs the new user in.
       */
      if (data.session) {
        /*
         * Full navigation ensures
         * Next.js receives the new
         * Supabase auth cookies.
         */
        window.location.replace(
          redirectTo
        );

        return;
      }

      /*
       * CASE 2:
       * Email confirmation is enabled.
       *
       * User exists but does not have
       * an authenticated session yet.
       */
      const message =
        "Account created successfully. Please check your email and confirm your account before signing in.";

      window.location.replace(
        `/login?message=${encodeURIComponent(
          message
        )}&redirect=${encodeURIComponent(
          redirectTo
        )}`
      );
    } catch (err) {
      console.error(
        "Registration error:",
        err
      );

      setError(
        "Something went wrong while creating your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-10">
        {/* Header */}

        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-100 bg-pink-50 text-pink-500">
            <UserPlus className="h-6 w-6" />
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-neutral-900">
            Create your account
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Join BLIZKITS to shop,
            manage your orders, and
            save your preferences.
          </p>
        </div>

        {/* Error */}

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <span>
              {error}
            </span>
          </div>
        )}

        {/* Form */}

        <form
          className="mt-8 space-y-5"
          onSubmit={
            handleRegister
          }
        >
          {/* Full Name */}

          <div>
            <label
              htmlFor="full-name"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
            >
              Full Name
            </label>

            <input
              id="full-name"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              disabled={
                loading
              }
              value={
                fullName
              }
              onChange={(e) =>
                setFullName(
                  e.target.value
                )
              }
              placeholder="Juan Dela Cruz"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:opacity-70"
            />
          </div>

          {/* Email */}

          <div>
            <label
              htmlFor="email-address"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
            >
              Email Address
            </label>

            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={
                loading
              }
              value={
                email
              }
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              placeholder="name@example.com"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:opacity-70"
            />
          </div>

          {/* Password */}

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              disabled={
                loading
              }
              value={
                password
              }
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              placeholder="••••••••"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:opacity-70"
            />

            <p className="mt-1.5 text-[11px] text-neutral-400">
              Use at least 6
              characters.
            </p>
          </div>

          {/* Submit */}

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              disabled={
                loading
              }
              className="w-full cursor-pointer bg-pink-500 text-sm font-bold text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Creating account..."
                : "Create Account"}
            </Button>
          </div>
        </form>

        {/* Login */}

        <p className="mt-7 text-center text-xs text-neutral-600">
          Already have an
          account?{" "}
          <Link
            href={`/login${
              redirectTo !==
              "/account"
                ? `?redirect=${encodeURIComponent(
                    redirectTo
                  )}`
                : ""
            }`}
            className="font-bold text-pink-500 transition-colors hover:text-pink-600"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE + SUSPENSE
========================================================= */

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-pink-500" />

            <p className="animate-pulse text-sm text-neutral-500">
              Loading registration...
            </p>
          </div>
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}