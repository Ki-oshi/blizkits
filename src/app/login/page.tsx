"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import {
  Disc,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const searchParams = useSearchParams();

  const redirectParam =
    searchParams.get("redirect");

  /*
   * Prevent open redirects.
   *
   * Only allow local paths such as:
   * /account
   * /shop
   * /cart
   */
  const redirectTo =
    redirectParam?.startsWith("/") &&
    !redirectParam.startsWith("//")
      ? redirectParam
      : "/account";

  const urlMessage =
    searchParams.get("message");

  const [successMessage, setSuccessMessage] =
    useState<string | null>(urlMessage);

  /*
   * Keep one browser Supabase client instance.
   */
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (isLoading) return;

    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      /*
       * Sign in and wait for Supabase to return the
       * authenticated user + session.
       */
      const {
        data,
        error: signInError,
      } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      /*
       * Make sure Supabase actually returned
       * an authenticated session.
       */
      if (!data.session || !data.user) {
        setError(
          "Unable to establish your session. Please try again."
        );
        return;
      }

      /*
       * Optional second verification.
       *
       * getUser() asks Supabase Auth for the current
       * authenticated user rather than only trusting
       * the local session.
       */
      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      if (
        userError ||
        !userData.user
      ) {
        setError(
          "Your login succeeded, but your session could not be verified. Please try again."
        );
        return;
      }

      /*
       * IMPORTANT:
       *
       * Use a full document navigation instead of
       * router.push().
       *
       * This guarantees the next request to Next.js
       * includes the newly-created Supabase auth
       * cookies.
       */
      window.location.replace(redirectTo);
    } catch (err) {
      console.error("Login error:", err);

      setError(
        "Something went wrong while signing in. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-10">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-100 bg-pink-50 text-pink-500">
            <Disc className="h-6 w-6" />
          </div>

          <h2 className="text-2xl font-black tracking-tight text-neutral-900">
            Welcome back to BLIZKITS
          </h2>

          <p className="text-xs text-neutral-500">
            Sign in to manage your photocards,
            custom keychains, and orders.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />

            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />

            <span>
              {successMessage}
            </span>
          </div>
        )}

        {/* Login Form */}
        <form
          className="space-y-4 pt-2"
          onSubmit={handleLogin}
        >
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
              disabled={isLoading}
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="kioshi@example.com"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:opacity-70"
            />
          </div>

          {/* Password */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-700"
              >
                Password
              </label>
            </div>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isLoading}
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="••••••••"
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:opacity-70"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full cursor-pointer bg-pink-500 py-3 text-sm font-bold text-white shadow-sm hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading
                ? "Signing in..."
                : "Sign In"}
            </Button>
          </div>
        </form>

        {/* Register */}
        <p className="pt-2 text-center text-xs text-neutral-600">
          Don&apos;t have an account yet?{" "}
          <Link
            href={`/register${
              redirectTo !== "/account"
                ? `?redirect=${encodeURIComponent(
                    redirectTo
                  )}`
                : ""
            }`}
            className="font-bold text-pink-500 transition-colors hover:text-pink-600"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}