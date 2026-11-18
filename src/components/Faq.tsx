import { Plus } from 'lucide-react';

/** Native <details> accordion: keyboard accessible and works before the app hydrates. */
export function Faq({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-surface">
      {items.map((item) => (
        <details key={item.question} className="group px-4 sm:px-5">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
            {item.question}
            <Plus className="size-4 shrink-0 text-fg-subtle transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
          </summary>
          <p className="pb-4 pr-8 text-sm leading-relaxed text-fg-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
