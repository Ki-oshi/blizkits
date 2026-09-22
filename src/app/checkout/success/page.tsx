import CheckoutSuccessClient from "./CheckoutSuccessClient";

interface SuccessPageProps {
  searchParams: Promise<{
    reference?: string;
  }>;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const params =
    await searchParams;

  const reference =
    params.reference ?? "";

  if (!reference) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-white">
        <p className="text-sm text-neutral-500">
          Invalid checkout reference.
        </p>
      </div>
    );
  }

  return (
    <CheckoutSuccessClient
      reference={reference}
    />
  );
}