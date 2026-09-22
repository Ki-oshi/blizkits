"use client";

import {
  useEffect,
  useState,
  useMemo,
} from "react";

import Link from "next/link";
import Image from "next/image";

import Container from "@/components/ui/Container";

import {
  Search,
  User,
  ShoppingBag,
  Menu,
} from "lucide-react";

import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  /*
   * Read the cart count from the SAME
   * CartContext used by ProductCard,
   * ProductInfo, and the cart page.
   *
   * totalItems counts quantities, not
   * just unique products.
   */
  const { totalItems } = useCart();

  /*
   * 99 remains 99.
   * 100 and above becomes 99+.
   */
  const cartBadge =
    totalItems > 99
      ? "99+"
      : totalItems.toString();

  /*
   * Stable Supabase browser client.
   */
  const supabase = useMemo(
    () => createClient(),
    []
  );

  /*
   * Keep Navbar authentication status
   * synchronized with Supabase.
   */
  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!mounted) return;

      setIsLoggedIn(
        Boolean(session?.user)
      );
    }

    void checkUser();

    /*
     * Update the account icon immediately
     * after login or logout.
     */
    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) return;

          setIsLoggedIn(
            Boolean(session?.user)
          );
        }
      );

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-100 bg-white">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Mobile Menu */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              className="p-2 text-neutral-900"
              aria-label="Open Menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center"
          >
            <Image
              src="/branding/logo.png"
              alt="BLIZKITS"
              width={90}
              height={36}
              className="h-17 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:gap-8">
            <Link
              href="/"
              className="text-sm font-medium text-neutral-900 transition-colors hover:text-pink-500"
            >
              Home
            </Link>

            <Link
              href="/shop"
              className="text-sm font-medium text-neutral-900 transition-colors hover:text-pink-500"
            >
              Shop
            </Link>

            <Link
              href="/about"
              className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
            >
              About
            </Link>

            <Link
              href="/faq"
              className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
            >
              FAQ
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <button
              type="button"
              className="p-2 text-neutral-900 transition-colors hover:text-pink-500"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Account */}
            <Link
              href={
                isLoggedIn
                  ? "/account"
                  : "/login"
              }
              className="hidden p-2 text-neutral-900 transition-colors hover:text-pink-500 md:block"
              title={
                isLoggedIn
                  ? "Account"
                  : "Sign In"
              }
              aria-label={
                isLoggedIn
                  ? "Account"
                  : "Sign In"
              }
            >
              <User className="h-5 w-5" />
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative p-2 text-neutral-900 transition-colors hover:text-pink-500"
              aria-label={`Shopping Cart${
                totalItems > 0
                  ? `, ${totalItems} items`
                  : ""
              }`}
            >
              <ShoppingBag className="h-5 w-5" />

              {/* Cart Count Badge */}
              {totalItems > 0 && (
                <span
                  className={`
                    absolute
                    -right-1
                    -top-1
                    flex
                    items-center
                    justify-center
                    rounded-full
                    bg-pink-500
                    px-1
                    text-[9px]
                    font-bold
                    leading-none
                    text-white
                    ${
                      totalItems > 99
                        ? "h-4 min-w-[24px]"
                        : "h-4 min-w-4"
                    }
                  `}
                >
                  {cartBadge}
                </span>
              )}
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}