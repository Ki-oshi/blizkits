"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "nextjs-toploader/app";

import Container from "@/components/ui/Container";

import {
  ArrowRight,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";

import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";

interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  stock: number;
}

interface SearchCategory {
  id: string;
  name: string;
  slug: string;
}

export default function Navbar() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  const [isSearchOpen, setIsSearchOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [
    searchProducts,
    setSearchProducts,
  ] = useState<SearchProduct[]>([]);

  const [
    searchCategories,
    setSearchCategories,
  ] = useState<SearchCategory[]>([]);

  const [isSearching, setIsSearching] =
    useState(false);

  const headerRef =
    useRef<HTMLElement | null>(null);

  const searchInputRef =
    useRef<HTMLInputElement | null>(null);

  /*
   * Cart
   */
  const { totalItems } = useCart();

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
   * Keep authentication state synchronized.
   */
  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setIsLoggedIn(
        Boolean(session?.user)
      );
    }

    void checkUser();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) {
            return;
          }

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

  /*
   * Focus search input whenever
   * the global search panel opens.
   */
  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const timeout =
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isSearchOpen]);

  /*
   * Close search when clicking
   * outside the header or pressing Escape.
   */
  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    function handlePointerDown(
      event: MouseEvent
    ) {
      if (
        headerRef.current &&
        !headerRef.current.contains(
          event.target as Node
        )
      ) {
        setIsSearchOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isSearchOpen]);

  /*
   * Live product/category suggestions.
   *
   * Full search is handled by /shop.
   * These results exist to provide
   * quick navigation while typing.
   */
  useEffect(() => {
    const trimmed =
      searchQuery.trim();

    if (
      !isSearchOpen ||
      trimmed.length < 2
    ) {
      setSearchProducts([]);
      setSearchCategories([]);
      setIsSearching(false);

      return;
    }

    let cancelled = false;

    const timeout =
      window.setTimeout(
        async () => {
          setIsSearching(true);

          try {
            const [
              productsResult,
              categoriesResult,
            ] =
              await Promise.all([
                supabase
                  .from("products")
                  .select(
                    `
                      id,
                      name,
                      slug,
                      price,
                      images,
                      stock
                    `
                  )
                  .ilike(
                    "name",
                    `%${trimmed}%`
                  )
                  .limit(5),

                supabase
                  .from("categories")
                  .select(
                    `
                      id,
                      name,
                      slug
                    `
                  )
                  .ilike(
                    "name",
                    `%${trimmed}%`
                  )
                  .limit(3),
              ]);

            if (cancelled) {
              return;
            }

            const products: SearchProduct[] =
              (
                productsResult.data ??
                []
              ).map(
                (product) => ({
                  id: product.id,
                  name:
                    product.name,
                  slug:
                    product.slug,
                  price: Number(
                    product.price ??
                      0
                  ),
                  images:
                    Array.isArray(
                      product.images
                    )
                      ? product.images
                      : [],
                  stock: Number(
                    product.stock ??
                      0
                  ),
                })
              );

            const categories: SearchCategory[] =
              (
                categoriesResult.data ??
                []
              ).map(
                (category) => ({
                  id: category.id,
                  name:
                    category.name,
                  slug:
                    category.slug,
                })
              );

            setSearchProducts(
              products
            );

            setSearchCategories(
              categories
            );
          } catch (error) {
            console.error(
              "Navbar search error:",
              error
            );

            if (!cancelled) {
              setSearchProducts(
                []
              );

              setSearchCategories(
                []
              );
            }
          } finally {
            if (!cancelled) {
              setIsSearching(
                false
              );
            }
          }
        },
        250
      );

    return () => {
      cancelled = true;

      window.clearTimeout(
        timeout
      );
    };
  }, [
    searchQuery,
    isSearchOpen,
    supabase,
  ]);

  function handleSearchSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmed =
      searchQuery.trim();

    if (!trimmed) {
      router.push("/shop");

      setIsSearchOpen(false);

      return;
    }

    router.push(
      `/shop?q=${encodeURIComponent(
        trimmed
      )}`
    );

    setIsSearchOpen(false);
  }

  function handleSearchClose() {
    setIsSearchOpen(false);
  }

  const hasSuggestions =
    searchProducts.length > 0 ||
    searchCategories.length > 0;

  const trimmedSearchQuery =
    searchQuery.trim();

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 w-full border-b border-neutral-100 bg-white"
    >
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
            onClick={
              handleSearchClose
            }
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
              onClick={
                handleSearchClose
              }
              className="text-sm font-medium text-neutral-900 transition-colors hover:text-pink-500"
            >
              Home
            </Link>

            <Link
              href="/shop"
              onClick={
                handleSearchClose
              }
              className="text-sm font-medium text-neutral-900 transition-colors hover:text-pink-500"
            >
              Shop
            </Link>

            <Link
              href="/about"
              onClick={
                handleSearchClose
              }
              className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
            >
              About
            </Link>

            <Link
              href="/faq"
              onClick={
                handleSearchClose
              }
              className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
            >
              FAQ
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Global Search */}
            <button
              type="button"
              onClick={() =>
                setIsSearchOpen(
                  (current) =>
                    !current
                )
              }
              className="p-2 text-neutral-900 transition-colors hover:text-pink-500"
              aria-label={
                isSearchOpen
                  ? "Close search"
                  : "Search"
              }
              aria-expanded={
                isSearchOpen
              }
            >
              {isSearchOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </button>

            {/* Account */}
            <Link
              href={
                isLoggedIn
                  ? "/account"
                  : "/login"
              }
              onClick={
                handleSearchClose
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
              onClick={
                handleSearchClose
              }
              className="relative p-2 text-neutral-900 transition-colors hover:text-pink-500"
              aria-label={`Shopping Cart${
                totalItems > 0
                  ? `, ${totalItems} items`
                  : ""
              }`}
            >
              <ShoppingBag className="h-5 w-5" />

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
                      totalItems >
                      99
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

      {/* ===================================================
          GLOBAL SEARCH PANEL
      =================================================== */}
      {isSearchOpen && (
        <div className="absolute left-0 top-full w-full border-b border-neutral-100 bg-white shadow-xl shadow-black/5">
          <Container>
            <div className="mx-auto max-w-3xl py-5 sm:py-6">
              {/* Search Form */}
              <form
                onSubmit={
                  handleSearchSubmit
                }
                className="relative"
                role="search"
              >
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />

                <input
                  ref={
                    searchInputRef
                  }
                  type="search"
                  value={
                    searchQuery
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchQuery(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search products, categories, keychains, photocards..."
                  autoComplete="off"
                  className="h-13 w-full rounded-2xl border border-neutral-200 bg-neutral-50 py-3 pl-12 pr-28 text-sm text-neutral-900 outline-none transition focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-500/10"
                />

                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-xl bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-pink-500"
                >
                  Search
                </button>
              </form>

              {/* Search Content */}
              <div className="mt-4">
                {!trimmedSearchQuery && (
                  <div className="rounded-xl bg-neutral-50 px-4 py-3">
                    <p className="text-xs leading-5 text-neutral-500">
                      Search the
                      BLIZKITS shop
                      from anywhere on
                      the website.
                      Search by product
                      name, description,
                      category, price,
                      or product status.
                    </p>
                  </div>
                )}

                {trimmedSearchQuery &&
                  trimmedSearchQuery.length <
                    2 && (
                    <p className="px-1 py-3 text-xs text-neutral-400">
                      Keep typing to
                      see quick
                      suggestions, or
                      press Enter to
                      search.
                    </p>
                  )}

                {trimmedSearchQuery.length >=
                  2 &&
                  isSearching && (
                    <div className="flex items-center gap-3 px-1 py-4">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-pink-500" />

                      <span className="text-xs text-neutral-500">
                        Searching...
                      </span>
                    </div>
                  )}

                {trimmedSearchQuery.length >=
                  2 &&
                  !isSearching &&
                  hasSuggestions && (
                    <div className="max-h-[420px] overflow-y-auto">
                      {/* Product Suggestions */}
                      {searchProducts.length >
                        0 && (
                        <div>
                          <div className="mb-2 flex items-center justify-between px-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                              Products
                            </p>
                          </div>

                          <div className="space-y-1">
                            {searchProducts.map(
                              (
                                product
                              ) => {
                                const image =
                                  product
                                    .images?.[0] ||
                                  "/placeholder.svg";

                                return (
                                  <Link
                                    key={
                                      product.id
                                    }
                                    href={`/product/${product.slug}`}
                                    onClick={
                                      handleSearchClose
                                    }
                                    className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-neutral-50"
                                  >
                                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                                      <img
                                        src={
                                          image
                                        }
                                        alt={
                                          product.name
                                        }
                                        className="h-full w-full object-cover"
                                      />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-semibold text-neutral-900 transition-colors group-hover:text-pink-500">
                                        {
                                          product.name
                                        }
                                      </p>

                                      <div className="mt-0.5 flex items-center gap-2">
                                        <span className="text-xs font-medium text-neutral-500">
                                          ₱
                                          {product.price.toLocaleString(
                                            "en-PH",
                                            {
                                              maximumFractionDigits: 2,
                                            }
                                          )}
                                        </span>

                                        <span className="text-neutral-300">
                                          •
                                        </span>

                                        <span
                                          className={`text-[11px] ${
                                            product.stock >
                                            0
                                              ? "text-emerald-600"
                                              : "text-neutral-400"
                                          }`}
                                        >
                                          {product.stock >
                                          0
                                            ? "In stock"
                                            : "Sold out"}
                                        </span>
                                      </div>
                                    </div>

                                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300 transition-all group-hover:translate-x-0.5 group-hover:text-pink-500" />
                                  </Link>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}

                      {/* Category Suggestions */}
                      {searchCategories.length >
                        0 && (
                        <div
                          className={
                            searchProducts.length >
                            0
                              ? "mt-4 border-t border-neutral-100 pt-4"
                              : ""
                          }
                        >
                          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                            Categories
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {searchCategories.map(
                              (
                                category
                              ) => (
                                <Link
                                  key={
                                    category.id
                                  }
                                  href={`/shop?category=${encodeURIComponent(
                                    category.slug
                                  )}`}
                                  onClick={
                                    handleSearchClose
                                  }
                                  className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600"
                                >
                                  {
                                    category.name
                                  }
                                </Link>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* View All */}
                      <div className="mt-4 border-t border-neutral-100 pt-4">
                        <Link
                          href={`/shop?q=${encodeURIComponent(
                            trimmedSearchQuery
                          )}`}
                          onClick={
                            handleSearchClose
                          }
                          className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-50 hover:text-pink-500"
                        >
                          <span>
                            View all
                            results for
                            &quot;
                            {
                              trimmedSearchQuery
                            }
                            &quot;
                          </span>

                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  )}

                {trimmedSearchQuery.length >=
                  2 &&
                  !isSearching &&
                  !hasSuggestions && (
                    <div className="rounded-xl bg-neutral-50 px-4 py-4">
                      <p className="text-sm font-medium text-neutral-700">
                        No quick
                        suggestions
                        found.
                      </p>

                      <p className="mt-1 text-xs leading-5 text-neutral-500">
                        Press Enter or
                        choose Search to
                        search the full
                        shop. The full
                        search also
                        checks product
                        descriptions,
                        categories,
                        price, and
                        status.
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}