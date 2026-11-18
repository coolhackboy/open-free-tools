import { useEffect } from 'react';
import { config } from './config';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { NotFound } from './components/NotFound';
import { ToolPage } from './components/ToolPage';
import { getToolCopy, type Locale } from './lib/copy';
import { useLanding } from './lib/landing';
import { href, parseRoute, routePath, useLocationKey, type Route } from './lib/router';
import { getFreeTool } from './tools/catalog';

const HTML_LANG: Record<Locale, string> = { en: 'en', zh: 'zh-CN' };

function setMeta(selector: string, attr: string, value: string) {
  const el = document.head.querySelector<HTMLElement>(selector);
  if (el) el.setAttribute(attr, value);
}

/** Keeps <title>, description, canonical and lang in sync on client-side navigation. */
function useDocumentMeta(route: Route) {
  const { landing } = useLanding(route.locale);
  useEffect(() => {
    let title = `${landing.index.metaTitle} | ${config.brandName}`;
    let description = landing.index.description;
    let path = routePath(route.locale);
    if (route.name === 'tool') {
      const tool = getFreeTool(route.slug)!;
      const copy = getToolCopy(tool, landing);
      title = `${copy.metaTitle} | ${config.brandName}`;
      description = copy.description;
      path = routePath(route.locale, route.slug);
    } else if (route.name === 'notfound') {
      title = `${route.locale === 'zh' ? '页面不存在' : 'Page not found'} | ${config.brandName}`;
    }
    document.title = title;
    document.documentElement.lang = HTML_LANG[route.locale];
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    // The prerendered page carries the absolute canonical; keep its origin and point it at this page.
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) {
      const url = `${new URL(canonical.href).origin}${href(path)}`;
      canonical.href = url;
      setMeta('meta[property="og:url"]', 'content', url);
    }
  }, [route, landing]);
}

export default function App() {
  const key = useLocationKey();
  const route = parseRoute(key.split('?')[0]);
  useDocumentMeta(route);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-fg focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {route.locale === 'zh' ? '跳到主要内容' : 'Skip to content'}
      </a>
      <Header route={route} />
      <main id="main" className="flex-1">
        {route.name === 'home' ? <Home locale={route.locale} /> : null}
        {route.name === 'tool' ? <ToolPage key={route.slug} slug={route.slug} locale={route.locale} /> : null}
        {route.name === 'notfound' ? <NotFound locale={route.locale} /> : null}
      </main>
      <Footer route={route} />
    </div>
  );
}
