import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowRight, Check, Clock3, SearchX, Search as SearchIcon, X } from 'lucide-react';
import { FREE_TOOLS, FREE_TOOL_CATEGORIES, getFreeTool, type FreeTool, type FreeToolCategoryId } from '@/tools/catalog';
import { tx } from '@/tools/controls';
import { shortTitle, toolEntry, type Landing, type Locale } from '@/lib/copy';
import { useLanding } from '@/lib/landing';
import { clearRecent, useRecent } from '@/lib/recent';
import { Link, navigate, routePath } from '@/lib/router';
import { search } from '@/lib/search';
import { useSearchIndex } from '@/lib/useSearch';
import { ToolCard } from './ToolCard';
import { ToolCardArt } from './ToolCardArt';
import { Faq } from './Faq';

type Tab = 'all' | FreeToolCategoryId;

function readParams(): { q: string; tab: Tab } {
  const params = new URLSearchParams(window.location.search);
  const c = params.get('c');
  const tab = FREE_TOOL_CATEGORIES.some((item) => item.id === c) ? (c as FreeToolCategoryId) : 'all';
  return { q: params.get('q') ?? '', tab };
}

/** Mirror the search and tab into the URL so Back and shared links restore them. */
function writeParams(q: string, tab: Tab) {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (tab !== 'all') params.set('c', tab);
  const next = `${window.location.pathname}${params.size ? `?${params}` : ''}`;
  if (next !== window.location.pathname + window.location.search) history.replaceState(null, '', next);
}

function Grid({ tools, landing, locale, showCategory }: { tools: FreeTool[]; landing: Landing; locale: Locale; showCategory?: boolean }) {
  return (
    <ul className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {tools.map((tool) => (
        <li key={tool.slug}>
          <ToolCard tool={tool} landing={landing} locale={locale} showCategory={showCategory} />
        </li>
      ))}
    </ul>
  );
}

function Recent({ landing, locale }: { landing: Landing; locale: Locale }) {
  const recent = useRecent();
  const tools = recent.map((slug) => getFreeTool(slug)).filter((tool): tool is FreeTool => Boolean(tool));
  if (!tools.length) return null;
  return (
    <section aria-labelledby="recent-heading" className="mb-10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="recent-heading" className="flex items-center gap-2 text-sm font-semibold text-fg-muted">
          <Clock3 className="size-4" aria-hidden="true" />
          {tx(locale, 'Recently used', '最近使用')}
        </h2>
        <button type="button" onClick={clearRecent} className="rounded-sm px-1.5 py-0.5 text-xs text-fg-subtle hover:text-fg">
          {tx(locale, 'Clear', '清除')}
        </button>
      </div>
      <ul className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {tools.map((tool) => (
          <li key={tool.slug} className="shrink-0">
            <Link
              to={routePath(locale, tool.slug)}
              className="flex h-11 items-center gap-2.5 rounded-full border border-line bg-surface py-1 pl-1 pr-4 text-sm font-medium shadow-sm transition-colors hover:border-line-strong"
            >
              <ToolCardArt kind={tool.kind} slug={tool.slug} className="size-9 shrink-0 rounded-full" />
              <span className="max-w-[16rem] truncate">{shortTitle(toolEntry(tool, landing).title)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Home({ locale }: { locale: Locale }) {
  const { landing } = useLanding(locale);
  const index = useSearchIndex(landing);
  const initial = useMemo(readParams, []);
  const [query, setQuery] = useState(initial.q);
  const [tab, setTab] = useState<Tab>(initial.tab);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => writeParams(query, tab), [query, tab]);

  const matches = useMemo(() => search(index, query), [index, query]);
  const counts = useMemo(() => {
    const out = new Map<Tab, number>([['all', matches.length]]);
    for (const tool of matches) out.set(tool.category, (out.get(tool.category) ?? 0) + 1);
    return out;
  }, [matches]);
  const visible = tab === 'all' ? matches : matches.filter((tool) => tool.category === tab);
  const searching = query.trim().length > 0;

  function onSearchKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && visible[0]) {
      event.preventDefault();
      navigate(routePath(locale, visible[0].slug));
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      resultsRef.current?.querySelector<HTMLAnchorElement>('[data-tool-card]')?.focus();
    } else if (event.key === 'Escape') {
      if (query) setQuery('');
      else inputRef.current?.blur();
    }
  }

  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...(tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])];
    const at = tabs.findIndex((item) => item === document.activeElement);
    if (at < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (at + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus();
    tabs[next].click();
  }

  /** Arrow keys move between cards in reading order; ArrowUp from the first row returns to search. */
  function onGridKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const cards = [...(resultsRef.current?.querySelectorAll<HTMLAnchorElement>('[data-tool-card]') ?? [])];
    const at = cards.findIndex((item) => item === document.activeElement);
    if (at < 0) return;
    const top = cards[at].getBoundingClientRect().top;
    const perRow = Math.max(1, cards.filter((item) => Math.abs(item.getBoundingClientRect().top - top) < 4).length);
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' ? -perRow : perRow;
    const next = at + step;
    event.preventDefault();
    if (next < 0) {
      inputRef.current?.focus();
      return;
    }
    cards[Math.min(cards.length - 1, next)]?.focus();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'all', label: tx(locale, 'All', '全部') },
    ...FREE_TOOL_CATEGORIES.map((item) => ({ id: item.id as Tab, label: landing.categories[item.id] })),
  ];

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-20 sm:px-6">
      <section className="pb-8 pt-10 text-center sm:pb-10 sm:pt-16">
        <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-fg-muted shadow-sm">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
          {tx(locale, `${FREE_TOOLS.length} free tools · open source`, `${FREE_TOOLS.length} 个免费工具 · 开源`)}
        </p>
        <h1 className="mx-auto max-w-3xl text-display text-balance">{landing.index.title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-fg-muted text-pretty sm:text-lg">{landing.index.description}</p>
        <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-fg-muted">
          {landing.page.badges.map((badge) => (
            <li key={badge} className="flex items-center gap-1.5">
              <Check className="size-4 text-accent-ink" aria-hidden="true" />
              {badge}
            </li>
          ))}
        </ul>
      </section>

      <div className="sticky top-14 z-20 -mx-4 mb-8 border-b border-line bg-glass px-4 pb-3 pt-3 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:backdrop-blur-none">
        <div className="relative mx-auto max-w-2xl">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <input
            id="tool-search"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onSearchKey}
            placeholder={landing.index.search}
            aria-label={tx(locale, 'Search tools', '搜索工具')}
            aria-controls="tool-results"
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full rounded-xl border border-line-strong bg-surface pl-11 pr-20 text-base text-fg shadow-sm placeholder:text-fg-subtle hover:border-fg-subtle/50 focus:border-accent-ink focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            {query ? (
              <button
                type="button"
                className="grid size-8 place-items-center rounded-full text-fg-subtle hover:bg-surface-2 hover:text-fg"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                aria-label={tx(locale, 'Clear search', '清除搜索')}
              >
                <X className="size-4" />
              </button>
            ) : (
              <kbd className="hidden rounded-md border border-line-strong bg-bg px-2 py-0.5 font-mono text-xs text-fg-subtle sm:inline-block" aria-hidden="true">/</kbd>
            )}
          </div>
        </div>
        <div
          ref={tabsRef}
          role="tablist"
          aria-label={tx(locale, 'Categories', '分类')}
          onKeyDown={onTabKey}
          className="scrollbar-none -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:mt-5 sm:flex-wrap sm:justify-center sm:px-0"
        >
          {tabs.map((item) => {
            const selected = tab === item.id;
            const count = counts.get(item.id) ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={selected}
                aria-controls="tool-results"
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(item.id)}
                disabled={searching && !count && !selected}
                className={[
                  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors disabled:opacity-40',
                  selected ? 'border-fg bg-fg text-bg' : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg',
                ].join(' ')}
              >
                {item.label}
                <span className={['tabular-nums text-xs', selected ? 'text-bg/70' : 'text-fg-subtle'].join(' ')}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div id="tool-results" ref={resultsRef} role="tabpanel" aria-labelledby={`tab-${tab}`} onKeyDown={onGridKey}>
        {!searching && tab === 'all' ? <Recent landing={landing} locale={locale} /> : null}
        {searching ? (
          <p className="mb-4 text-sm text-fg-muted" role="status" aria-live="polite">
            {visible.length
              ? tx(locale, `${visible.length} ${visible.length === 1 ? 'tool' : 'tools'} for “${query.trim()}”`, `“${query.trim()}”共 ${visible.length} 个工具`)
              : ''}
          </p>
        ) : null}
        {!visible.length ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong px-6 py-16 text-center">
            <SearchX className="size-7 text-fg-subtle" aria-hidden="true" />
            <p className="text-base font-medium">{tx(locale, `No tools match “${query.trim()}”`, `没有匹配“${query.trim()}”的工具`)}</p>
            <p className="max-w-sm text-sm text-fg-muted">{tx(locale, 'Try a shorter word, a file type such as “pdf” or “mp4”, or browse all tools.', '试试更短的词、文件类型（如“pdf”“mp4”），或浏览全部工具。')}</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setTab('all');
                inputRef.current?.focus();
              }}
              className="mt-1 inline-flex h-9 items-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-surface-2"
            >
              {tx(locale, 'Show all tools', '显示全部工具')}
            </button>
          </div>
        ) : searching || tab !== 'all' ? (
          <Grid tools={visible} landing={landing} locale={locale} showCategory={searching && tab === 'all'} />
        ) : (
          FREE_TOOL_CATEGORIES.map((category) => {
            const group = visible.filter((tool) => tool.category === category.id);
            if (!group.length) return null;
            return (
              <section key={category.id} aria-labelledby={`cat-${category.id}`} className="mb-12 [content-visibility:auto] [contain-intrinsic-size:auto_900px]">
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h2 id={`cat-${category.id}`} className="text-lg font-semibold tracking-tight">
                    {landing.categories[category.id]} <span className="ml-1 text-sm font-normal tabular-nums text-fg-subtle">{group.length}</span>
                  </h2>
                  {group.length > 8 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTab(category.id);
                        tabsRef.current?.scrollIntoView({ block: 'nearest' });
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-sm text-sm font-medium text-accent-ink hover:underline"
                    >
                      {tx(locale, 'See all', '查看全部')}
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                <Grid tools={group.slice(0, 8)} landing={landing} locale={locale} />
              </section>
            );
          })
        )}
      </div>

      <section aria-labelledby="home-faq" className="mx-auto mt-16 max-w-3xl">
        <h2 id="home-faq" className="mb-4 text-h2">{landing.index.faqTitle}</h2>
        <Faq items={landing.index.faqs} />
      </section>
    </div>
  );
}
