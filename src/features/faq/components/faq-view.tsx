"use client";

import { Plus, Search } from "lucide-react";
import { useId, useState } from "react";
import { Disclosure } from "@/components/ui/disclosure";
import { cn } from "@/lib/utils";
import { faqCategories, type Faq } from "../content";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * Searchable FAQ: category tabs over an accordion. Typing a query searches
 * every category at once and replaces the tabbed view with the matches.
 */
export function FaqView() {
  const [active, setActive] = useState(faqCategories[0]!.id);
  const [query, setQuery] = useState("");
  const searchId = useId();
  const panelId = useId();

  const term = query.trim().toLowerCase();
  const category =
    faqCategories.find((c) => c.id === active) ?? faqCategories[0]!;
  const matches = term
    ? faqCategories.flatMap((c) =>
        c.faqs.filter((f) =>
          `${f.question} ${f.answer}`.toLowerCase().includes(term),
        ),
      )
    : [];

  return (
    <>
      <label
        htmlFor={searchId}
        className="mt-8 flex max-w-[680px] items-center gap-3 border-b border-stroke pb-3 focus-within:border-black"
      >
        <Search size={18} strokeWidth={1.5} aria-hidden />
        <span className="sr-only">Search FAQs</span>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search FAQs"
          className="w-full bg-transparent text-body-2 outline-none placeholder:text-muted"
        />
      </label>

      {term ? (
        <section className="mt-10" aria-live="polite">
          <h2 className="text-h4 uppercase">Search results</h2>
          {matches.length === 0 ? (
            <p className="mt-6 text-body-2 text-muted">
              No questions match &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <FaqList faqs={matches} />
          )}
        </section>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="FAQ categories"
            className="mt-8 flex gap-6 overflow-x-auto border-b border-stroke md:gap-8"
          >
            {faqCategories.map((c) => {
              const selected = c.id === category.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={panelId}
                  onClick={() => setActive(c.id)}
                  className={cn(
                    "shrink-0 border-b-2 pb-3 text-body-2 whitespace-nowrap uppercase",
                    selected
                      ? "border-black text-black"
                      : "border-transparent text-muted hover:text-black",
                    focusRing,
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <section id={panelId} role="tabpanel" className="mt-8 md:mt-10">
            <h2 className="text-h4 uppercase">{category.label}</h2>
            {/* Keyed so switching tabs resets which answers are open. */}
            <FaqList key={category.id} faqs={category.faqs} openFirst />
          </section>
        </>
      )}
    </>
  );
}

function FaqList({ faqs, openFirst }: { faqs: Faq[]; openFirst?: boolean }) {
  return (
    <ul className="mt-6 border-b border-stroke">
      {faqs.map((faq, i) => (
        <li key={faq.question} className="border-t border-stroke">
          <Disclosure
            defaultOpen={openFirst && i === 0}
            summaryClassName="items-start gap-6 py-5 text-body-2"
            summary={
              <>
                {faq.question}
                <Plus
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden
                  className="mt-0.5 shrink-0 transition-transform duration-300 group-data-open:rotate-45"
                />
              </>
            }
          >
            <p className="-mt-1 max-w-[600px] pb-6 text-body-2 text-muted">
              {faq.answer}
            </p>
          </Disclosure>
        </li>
      ))}
    </ul>
  );
}
