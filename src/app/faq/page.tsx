import Container from "@/components/ui/Container";
import FaqAccordion from "@/components/ui/FaqAccordion";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FAQPage() {
  const supabase = await createClient();

  // Fetch only active FAQs and order them by the sort_order column
  const { data: faqs, error } = await supabase
    .from("faqs")
    .select("id, question, answer")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching FAQs:", error);
  }

  return (
    <div className="bg-white py-16 sm:py-24">
      <Container className="max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black tracking-tight text-neutral-900 sm:text-5xl">
            Frequently Asked <span className="text-pink-500">Questions</span>
          </h1>
          <p className="mt-4 text-lg text-neutral-500 max-w-xl mx-auto">
            Everything you need to know about our K-pop photocards, custom keychains, shipping protection, and orders.
          </p>
        </div>

        {/* Client-side Accordion containing live search */}
        <FaqAccordion faqs={faqs || []} />
      </Container>
    </div>
  );
}