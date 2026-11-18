import { Compass } from 'lucide-react';
import { tx } from '@/tools/controls';
import type { Locale } from '@/lib/copy';
import { Link, routePath } from '@/lib/router';

export function NotFound({ locale }: { locale: Locale }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="grid size-12 place-items-center rounded-xl border border-line bg-surface text-fg-muted shadow-sm">
        <Compass className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">{tx(locale, 'Page not found', '页面不存在')}</h1>
      <p className="mt-2 text-sm text-fg-muted">
        {tx(locale, 'This link may be old, or the tool has moved. Search the full list instead.', '这个链接可能已失效，或者工具已移动。去完整列表里找找吧。')}
      </p>
      <Link
        to={routePath(locale)}
        className="mt-6 inline-flex h-10 items-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
      >
        {tx(locale, 'Browse all tools', '浏览全部工具')}
      </Link>
    </div>
  );
}
