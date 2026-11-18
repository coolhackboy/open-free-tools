import { useEffect } from 'react';
import { ArrowRight, Check, ChevronRight, ShieldCheck } from 'lucide-react';
import { getFreeTool } from '@/tools/catalog';
import { tx } from '@/tools/controls';
import { Workspace } from '@/tools/Workspace';
import { getToolCopy, relatedTools, type Locale } from '@/lib/copy';
import { useLanding } from '@/lib/landing';
import { rememberTool } from '@/lib/recent';
import { Link, routePath } from '@/lib/router';
import { Faq } from './Faq';
import { ToolCard } from './ToolCard';

function splitLead(text: string) {
  const match = text.match(/^[^.!?。！？]+[.!?。！？]/);
  if (!match) return { lead: text, rest: '' };
  const lead = match[0].trim();
  const rest = text.slice(match[0].length).trim();
  if (lead.length > 140) return { lead: text, rest: '' };
  return { lead, rest };
}

export function ToolPage({ slug, locale }: { slug: string; locale: Locale }) {
  const tool = getFreeTool(slug)!;
  const { landing } = useLanding(locale);
  const copy = getToolCopy(tool, landing);
  const related = relatedTools(tool, 8);
  const { lead, rest } = splitLead(copy.description);

  useEffect(() => rememberTool(slug), [slug]);

  return (
    <article className="mx-auto w-full max-w-[1200px] px-4 pb-20 sm:px-6">
      <nav aria-label={tx(locale, 'Breadcrumb', '导航')} className="pt-5 text-[13px] text-fg-subtle">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link to={routePath(locale)} className="rounded-sm hover:text-fg">{tx(locale, 'All tools', '全部工具')}</Link>
          </li>
          <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
          <li>
            <Link to={`${routePath(locale)}?c=${tool.category}`} className="rounded-sm hover:text-fg">
              {copy.eyebrow}
            </Link>
          </li>
          <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
          <li aria-current="page" className="truncate text-fg-muted">{copy.title}</li>
        </ol>
      </nav>

      <header className="max-w-3xl pb-6 pt-6 sm:pb-8 sm:pt-8">
        <h1 className="text-display text-balance">{copy.title}</h1>
        <p className="mt-3 text-lg leading-relaxed text-fg text-pretty sm:text-xl">{lead}</p>
        {rest ? <p className="mt-2 text-[15px] leading-relaxed text-fg-muted text-pretty">{rest}</p> : null}
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-fg-muted">
          {copy.badges.map((badge) => (
            <li key={badge} className="flex items-center gap-1.5">
              <Check className="size-3.5 text-accent-ink" aria-hidden="true" />
              {badge}
            </li>
          ))}
        </ul>
      </header>

      <section id="workspace" aria-label={copy.title} className="scroll-mt-20">
        <Workspace tool={tool} locale={locale} />
        <p className="mt-3 flex items-start gap-2 px-1 text-[13px] leading-relaxed text-fg-subtle">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{copy.features[0]?.body}</span>
        </p>
      </section>

      {copy.steps.length ? (
        <section aria-labelledby="how" className="mt-16">
          <p className="text-eyebrow uppercase text-fg-subtle">{landing.page.stepsKicker}</p>
          <h2 id="how" className="mt-2 text-h2">{copy.howTitle}</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {copy.steps.map((step, index) => (
              <li key={step.title} className="rounded-xl border border-line bg-surface p-5">
                <span className="grid size-7 place-items-center rounded-full bg-accent-soft font-mono text-xs font-semibold text-accent-ink" aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-h3">{step.title}</h3>
                <p className="mt-1.5 text-small text-fg-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section aria-labelledby="uses" className="mt-14">
        <p className="text-eyebrow uppercase text-fg-subtle">{landing.page.usesKicker}</p>
        <h2 id="uses" className="mt-2 text-h2">{copy.useTitle}</h2>
        <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-3">
          {copy.uses.map((item) => (
            <div key={item.title} className="border-t border-line pt-4">
              <h3 className="text-[15px] font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-small text-fg-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq" className="mt-14 max-w-3xl">
        <h2 id="faq" className="mb-5 text-h2">{copy.faqTitle}</h2>
        <Faq items={copy.faqs} />
      </section>

      <section aria-labelledby="related" className="mt-16">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 id="related" className="text-h3">{copy.relatedTitle}</h2>
          <Link to={routePath(locale)} className="inline-flex shrink-0 items-center gap-1 rounded-sm text-sm font-medium text-accent-ink hover:underline">
            {landing.page.allTools}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <ul className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {related.map((item) => (
            <li key={item.slug}>
              <ToolCard tool={item} landing={landing} locale={locale} />
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
