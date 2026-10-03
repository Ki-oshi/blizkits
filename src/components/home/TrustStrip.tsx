import {
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

import Container from "@/components/ui/Container";

const trustItems = [
  {
    title: "Custom Keychains",
    description:
      "Handmade aesthetic charms created for your collection.",
    icon: Sparkles,
  },
  {
    title: "Nationwide Shipping",
    description:
      "Carefully packed orders delivered across the Philippines.",
    icon: Truck,
  },
  {
    title: "Secure Checkout",
    description:
      "Protected checkout with reliable payment options.",
    icon: ShieldCheck,
  },
];

export default function TrustStrip() {
  return (
    <section className="border-b border-neutral-100 bg-white">
      <Container>
        <div className="grid grid-cols-1 divide-y divide-neutral-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {trustItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="flex items-center gap-4 px-2 py-6 sm:px-5 lg:px-8"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-500">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-neutral-900">
                    {item.title}
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}