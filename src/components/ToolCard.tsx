import { memo } from 'react';
import type { FreeTool } from '@/tools/catalog';
import { shortTitle, toolEntry, type Landing, type Locale } from '@/lib/copy';
import { Link, routePath } from '@/lib/router';
import { ToolCardArt } from './ToolCardArt';

type Props = { tool: FreeTool; landing: Landing; locale: Locale; showCategory?: boolean };

export const ToolCard = memo(function ToolCard({ tool, landing, locale, showCategory }: Props) {
  const entry = toolEntry(tool, landing);
  return (
    <Link
      to={routePath(locale, tool.slug)}
      data-tool-card={tool.slug}
      className="group flex h-full items-center gap-3.5 rounded-lg border border-line bg-surface p-2.5 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md focus-visible:-translate-y-0.5 sm:flex-col sm:items-stretch sm:gap-0 sm:p-0"
    >
      <ToolCardArt
        kind={tool.kind}
        slug={tool.slug}
        className="aspect-square w-16 shrink-0 rounded-md sm:aspect-[16/10] sm:w-full sm:rounded-none sm:rounded-t-[calc(var(--radius-sm)-1px)]"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1 sm:p-3.5 sm:pt-3">
        {showCategory ? <span className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{landing.categories[tool.category]}</span> : null}
        <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-fg">{shortTitle(entry.title)}</span>
        <span className="line-clamp-2 text-[13px] leading-5 text-fg-muted">{entry.description}</span>
      </span>
    </Link>
  );
});
