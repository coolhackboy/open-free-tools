import { useEffect, useState } from 'react';
import { Moon, Search as SearchIcon, Sun } from 'lucide-react';
import { config } from '@/config';
import { tx } from '@/tools/controls';
import { Link, routePath, type Route } from '@/lib/router';
import { setTheme, useResolvedTheme } from '@/ui/theme';
import { GithubIcon, Mark } from './Brand';
import { QuickSearch } from './QuickSearch';

function typingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export function LangSwitch({ route }: { route: Route }) {
  const slug = route.name === 'tool' ? route.slug : undefined;
  const items = [
    { locale: 'en' as const, label: 'EN', name: 'English' },
    { locale: 'zh' as const, label: '中文', name: '简体中文' },
  ];
  return (
    <div className="flex h-8 items-center rounded-md border border-line bg-surface p-0.5 text-xs font-medium" role="group" aria-label="Language / 语言">
      {items.map((item) => {
        const current = route.locale === item.locale;
        return (
          <Link
            key={item.locale}
            to={routePath(item.locale, slug)}
            hrefLang={item.locale === 'zh' ? 'zh-CN' : 'en'}
            lang={item.locale === 'zh' ? 'zh-CN' : 'en'}
            aria-current={current ? 'true' : undefined}
            aria-label={item.name}
            className={['grid h-full min-w-9 place-items-center rounded-[5px] px-2 transition-colors', current ? 'bg-surface-3 text-fg' : 'text-fg-subtle hover:text-fg'].join(' ')}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function ThemeToggle({ locale }: { locale: string }) {
  const theme = useResolvedTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? tx(locale, 'Switch to dark theme', '切换到深色') : tx(locale, 'Switch to light theme', '切换到浅色');
  const Icon = theme === 'dark' ? Moon : Sun;
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      <Icon className="size-[18px]" strokeWidth={1.75} />
    </button>
  );
}

export function Header({ route }: { route: Route }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { locale } = route;
  const isHome = route.name === 'home';

  function openSearch() {
    const main = document.getElementById('tool-search') as HTMLInputElement | null;
    if (isHome && main) {
      main.focus();
      main.select();
      return;
    }
    setPaletteOpen(true);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if ((mod && event.key.toLowerCase() === 'k') || (event.key === '/' && !mod && !event.altKey && !typingTarget(event.target))) {
        event.preventDefault();
        openSearch();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-glass backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Link to={routePath(locale)} className="mr-auto flex min-w-0 items-center gap-2.5 rounded-md py-1 pr-1 font-semibold tracking-tight">
          <Mark className="size-7 shrink-0" />
          <span className="truncate text-[15px]">{config.brandName}</span>
        </Link>
        <button
          type="button"
          onClick={openSearch}
          aria-label={tx(locale, 'Search tools', '搜索工具')}
          aria-keyshortcuts="/ Control+K Meta+K"
          className="flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-sm text-fg-subtle transition-colors hover:border-line-strong hover:text-fg sm:w-56 lg:w-64"
        >
          <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="hidden flex-1 text-left sm:inline">{tx(locale, 'Search tools', '搜索工具')}</span>
          <kbd className="hidden rounded border border-line-strong px-1.5 font-mono text-[11px] sm:inline-block" aria-hidden="true">/</kbd>
        </button>
        <LangSwitch route={route} />
        <ThemeToggle locale={locale} />
        {config.repoUrl ? (
          <a
            href={config.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={tx(locale, 'Source code on GitHub', 'GitHub 源代码')}
            title={tx(locale, 'Source code on GitHub', 'GitHub 源代码')}
            className="hidden size-9 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg min-[420px]:grid"
          >
            <GithubIcon />
          </a>
        ) : null}
      </div>
      <QuickSearch locale={locale} open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
