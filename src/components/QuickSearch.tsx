import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { CornerDownLeft, Search as SearchIcon } from 'lucide-react';
import { tx } from '@/tools/controls';
import { shortTitle, toolEntry, type Locale } from '@/lib/copy';
import { useLanding } from '@/lib/landing';
import { navigate, routePath } from '@/lib/router';
import { search } from '@/lib/search';
import { useSearchIndex } from '@/lib/useSearch';
import { ToolCardArt } from './ToolCardArt';

/** Command-palette style search, available from every page (/ or Ctrl/⌘+K). */
export function QuickSearch({ locale, open, onClose }: { locale: Locale; open: boolean; onClose: () => void }) {
  const { landing } = useLanding(locale);
  const index = useSearchIndex(landing);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const listId = useId();

  const results = useMemo(() => search(index, query).slice(0, 30), [index, query]);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    setQuery('');
    setActive(0);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  function go(slug: string) {
    onClose();
    navigate(routePath(locale, slug));
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((value) => Math.min(results.length - 1, value + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((value) => Math.max(0, value - 1));
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      go(results[active].slug);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      inputRef.current?.focus();
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[8vh] sm:p-6 sm:pt-[12vh]" onKeyDown={onKey}>
      <div className="absolute inset-0 animate-fade-in bg-overlay backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tx(locale, 'Search tools', '搜索工具')}
        className="relative flex max-h-[min(560px,80vh)] w-full max-w-xl animate-fade-in flex-col overflow-hidden rounded-xl border border-line-strong bg-surface shadow-lg"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <SearchIcon className="size-[18px] shrink-0 text-fg-subtle" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder={landing.index.search}
            aria-label={tx(locale, 'Search tools', '搜索工具')}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          <kbd className="hidden rounded-md border border-line-strong px-1.5 py-0.5 font-mono text-[11px] text-fg-subtle sm:inline-block">Esc</kbd>
        </div>
        {results.length ? (
          <ul ref={listRef} id={listId} role="listbox" className="overflow-y-auto overscroll-contain p-1.5">
            {results.map((tool, at) => {
              const entry = toolEntry(tool, landing);
              return (
                <li
                  key={tool.slug}
                  id={`${listId}-${at}`}
                  data-index={at}
                  role="option"
                  aria-selected={at === active}
                  onMouseMove={() => setActive(at)}
                  onClick={() => go(tool.slug)}
                  className={['flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2', at === active ? 'bg-surface-2' : ''].join(' ')}
                >
                  <ToolCardArt kind={tool.kind} slug={tool.slug} className="size-9 shrink-0 rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">{shortTitle(entry.title)}</span>
                    <span className="block truncate text-xs text-fg-subtle">{landing.categories[tool.category]}</span>
                  </span>
                  {at === active ? <CornerDownLeft className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" /> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-10 text-center text-sm text-fg-muted">{landing.index.empty}</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
