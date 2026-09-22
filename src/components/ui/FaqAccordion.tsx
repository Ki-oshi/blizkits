"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/utils/cn";

interface Faq {
  id: string;
  question: string;
  answer: string;
}

export default function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter FAQs dynamically based on the search query input
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const query = searchQuery.toLowerCase();
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
    );
  }, [faqs, searchQuery]);

  if (faqs.length === 0) {
    return <p className="text-center text-neutral-500 py-12">No FAQs available at the moment.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Search Input Bar */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <Search className="h-4 w-4 text-neutral-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search questions (e.g., shipping, payment)..."
          className="block w-full rounded-2xl border-0 py-3.5 pl-11 pr-4 text-neutral-900 ring-1 ring-inset ring-neutral-200 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-pink-500 sm:text-sm shadow-sm transition-all bg-neutral-50/50"
        />
      </div>

      {filteredFaqs.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-2xl border border-neutral-100">
          <p className="text-neutral-500 text-sm">No matching questions found for &ldquo;{searchQuery}&rdquo;</p>
          <button 
            onClick={() => setSearchQuery("")}
            className="mt-2 text-xs font-semibold text-pink-500 hover:underline"
          >
            Clear search filter
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFaqs.map((faq, index) => (
            <div 
              key={faq.id} 
              className="rounded-2xl border border-neutral-200 bg-neutral-50 overflow-hidden transition-all duration-200 shadow-sm"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between px-6 py-5 text-left focus:outline-none cursor-pointer"
              >
                <span className="text-base font-semibold text-neutral-900 pr-4">
                  {faq.question}
                </span>
                <ChevronDown 
                  className={cn(
                    "h-5 w-5 text-neutral-400 transition-transform duration-300 shrink-0",
                    openIndex === index ? "rotate-180 text-pink-500" : ""
                  )} 
                />
              </button>
              
              <div 
                className={cn(
                  "px-6 overflow-hidden transition-all duration-300 ease-in-out",
                  openIndex === index ? "max-h-96 pb-6 opacity-100" : "max-h-0 opacity-0"
                )}
              >
                <p className="text-neutral-600 leading-relaxed text-sm sm:text-base border-t border-neutral-200/60 pt-4">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}