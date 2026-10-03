"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import { useRouter } from "nextjs-toploader/app";

import {
  Search,
  X,
} from "lucide-react";

export default function ProductSearch() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const currentQuery =
    searchParams.get("q") ?? "";

  const [query, setQuery] =
    useState(currentQuery);

  /*
   * Keep the input synchronized when
   * navigating between search URLs.
   */
  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedQuery =
      query.trim();

    /*
     * Always search the entire shop,
     * regardless of the page/category
     * the user came from.
     */
    if (!trimmedQuery) {
      router.push("/shop");

      return;
    }

    router.push(
      `/shop?q=${encodeURIComponent(
        trimmedQuery
      )}`
    );
  }

  function handleClear() {
    setQuery("");

    router.push("/shop");
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="flex w-full max-w-md items-center gap-2"
      role="search"
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

        <input
          type="search"
          value={query}
          onChange={(event) =>
            setQuery(
              event.target.value
            )
          }
          placeholder="Search products..."
          autoComplete="off"
          className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-10 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-pink-300 focus:ring-4 focus:ring-pink-500/10"
        />

        {query && (
          <button
            type="button"
            onClick={
              handleClear
            }
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <button
        type="submit"
        className="cursor-pointer rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-pink-500"
      >
        Search
      </button>
    </form>
  );
}