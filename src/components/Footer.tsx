import { config } from '@/config';
import { FREE_TOOLS } from '@/tools/catalog';
import { tx } from '@/tools/controls';
import { Link, routePath, type Route } from '@/lib/router';
import { Mark } from './Brand';

export function Footer({ route }: { route: Route }) {
  const { locale } = route;
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-bg-subtle">
      <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr] sm:px-6">
        <div>
          <Link to={routePath(locale)} className="inline-flex items-center gap-2.5 rounded-md font-semibold">
            <Mark className="size-6" />
            {config.brandName}
          </Link>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-fg-muted">
            {tx(
              locale,
              `${FREE_TOOLS.length} free tools that run in your browser. Your files are processed on your device and never uploaded. No accounts, no cookies, no analytics.`,
              `${FREE_TOOLS.length} 个在浏览器里运行的免费工具。文件在你的设备上处理，不会上传。没有账号、没有 Cookie、没有统计分析。`,
            )}
          </p>
        </div>
        <nav aria-label={tx(locale, 'Footer', '页脚')} className="flex flex-wrap content-start gap-x-6 gap-y-2 text-sm sm:justify-end">
          <Link to={routePath(locale)} className="rounded-sm text-fg-muted hover:text-fg">{tx(locale, 'All tools', '全部工具')}</Link>
          {config.repoUrl ? (
            <>
              <a href={config.repoUrl} target="_blank" rel="noopener noreferrer" className="rounded-sm text-fg-muted hover:text-fg">
                {tx(locale, 'Source code', '源代码')}
              </a>
              <a href={`${config.repoUrl}#privacy`} target="_blank" rel="noopener noreferrer" className="rounded-sm text-fg-muted hover:text-fg">
                {tx(locale, 'Privacy', '隐私')}
              </a>
              <a href={`${config.repoUrl}#self-host`} target="_blank" rel="noopener noreferrer" className="rounded-sm text-fg-muted hover:text-fg">
                {tx(locale, 'Host your own', '自行部署')}
              </a>
            </>
          ) : null}
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 text-xs text-fg-subtle sm:px-6">
          <span>
            © {year} {config.brandName} · {tx(locale, 'MIT licensed', 'MIT 许可证')}
          </span>
          {config.showPoweredBy ? (
            <a href={config.poweredBy.url} target="_blank" rel="noopener" className="rounded-sm hover:text-fg">
              Powered by {config.poweredBy.name}
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
