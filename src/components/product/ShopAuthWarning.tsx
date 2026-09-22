import Link from "next/link";
import Container from "@/components/ui/Container";

export default function ShopAuthWarning() {
  return (
    <div className="min-h-[80vh] bg-white flex items-center justify-center">
      <Container>
        <div className="mx-auto flex max-w-xl flex-col items-center justify-center text-center">
          
          {/* Warning Icon */}
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-300 bg-orange-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-orange-500"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="8.5" />
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

          {/* Title */}
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Sign In Required
          </h1>

          {/* Description */}
          <p className="mt-4 max-w-md text-sm leading-6 text-neutral-500 sm:text-base">
            Please sign in or create an account first to browse the shop,
            save items, and proceed with checkout.
          </p>

          {/* Buttons */}
          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login?redirect=/shop"
              className="inline-flex min-w-[180px] items-center justify-center rounded-full bg-pink-500 px-8 py-3 text-base font-semibold text-white transition hover:bg-pink-600"
            >
              Sign In
            </Link>

            <Link
              href="/register?redirect=/shop"
              className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-neutral-300 bg-white px-8 py-3 text-base font-semibold text-neutral-900 transition hover:bg-neutral-50"
            >
              Register
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}