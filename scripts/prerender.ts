/**
 * Post-build step (a Vite plugin, runs after `vite build`): writes one static HTML file per page so every
 * tool has its own URL with the right <title>, description, canonical, Open Graph tags and JSON-LD,
 * even on hosts without rewrites (GitHub Pages). Also writes sitemap.xml, robots.txt and 404.html.
 *
 *   dist/index.html                    home (en)
 *   dist/tools/<slug>/index.html       tool page (en)
 *   dist/zh/index.html                 home (zh)
 *   dist/zh/tools/<slug>/index.html    tool page (zh)
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { FREE_TOOLS } from '../src/tools/catalog.ts';
import { LOCALES, getToolCopy, pagePath, type Landing, type Locale } from '../src/lib/copy.ts';
import en from '../src/copy/en.json' with { type: 'json' };
import zh from '../src/copy/zh.json' with { type: 'json' };

const LANDING: Record<Locale, Landing> = { en: en as unknown as Landing, zh: zh as unknown as Landing };
const HTML_LANG: Record<Locale, string> = { en: 'en', zh: 'zh-CN' };
const OG_LOCALE: Record<Locale, string> = { en: 'en_US', zh: 'zh_CN' };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Escape "<" so copy such as "</script>" cannot break out of the JSON-LD tag. */
const jsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

type Page = {
  locale: Locale;
  slug?: string;
  title: string;
  description: string;
  /** Static HTML placed inside #root until the app mounts (crawlers without JS read this). */
  body: string;
  ld: unknown[];
};

export function prerender(opts: { brandName: string; siteUrl: string }): Plugin {
  let base = '/';
  let outDir = 'dist';
  const site = opts.siteUrl.replace(/\/+$/, '');
  const brand = opts.brandName;

  const href = (locale: Locale, slug?: string) => `${base}${pagePath(locale, slug)}`;
  const absolute = (locale: Locale, slug?: string) => (site ? `${site}/${pagePath(locale, slug)}` : '');

  function head(page: Page) {
    const url = absolute(page.locale, page.slug);
    const ogImage = site ? `${site}/og.png` : '';
    const tags = [
      `<title>${esc(page.title)}</title>`,
      `<meta name="description" content="${esc(page.description)}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="${esc(brand)}" />`,
      `<meta property="og:title" content="${esc(page.title)}" />`,
      `<meta property="og:description" content="${esc(page.description)}" />`,
      `<meta property="og:locale" content="${OG_LOCALE[page.locale]}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
    ];
    if (url) {
      tags.push(`<link rel="canonical" href="${esc(url)}" />`, `<meta property="og:url" content="${esc(url)}" />`);
      for (const locale of LOCALES) {
        tags.push(`<link rel="alternate" hreflang="${HTML_LANG[locale]}" href="${esc(absolute(locale, page.slug))}" />`);
      }
      tags.push(`<link rel="alternate" hreflang="x-default" href="${esc(absolute('en', page.slug))}" />`);
    }
    if (ogImage) {
      tags.push(
        `<meta property="og:image" content="${esc(ogImage)}" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta name="twitter:image" content="${esc(ogImage)}" />`,
      );
    }
    for (const item of page.ld) tags.push(`<script type="application/ld+json">${jsonLd(item)}</script>`);
    return tags.join('\n    ');
  }

  function homePage(locale: Locale): Page {
    const copy = LANDING[locale];
    const links = FREE_TOOLS.map((tool) => `<li><a href="${href(locale, tool.slug)}">${esc(copy.tools[tool.slug]?.title ?? tool.title)}</a></li>`).join('');
    return {
      locale,
      title: `${copy.index.metaTitle} | ${brand}`,
      description: copy.index.description,
      body: `<main class="shell"><h1>${esc(copy.index.title)}</h1><p>${esc(copy.index.description)}</p><ul class="shell-links">${links}</ul></main>`,
      ld: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: brand,
          description: copy.index.description,
          inLanguage: HTML_LANG[locale],
          ...(site ? { url: absolute(locale) } : {}),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: copy.index.faqs.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })),
        },
      ],
    };
  }

  function toolPage(locale: Locale, slug: string): Page {
    const tool = FREE_TOOLS.find((item) => item.slug === slug)!;
    const landing = LANDING[locale];
    const copy = getToolCopy(tool, landing);
    const steps = copy.steps.map((step) => `<li><strong>${esc(step.title)}</strong> ${esc(step.body)}</li>`).join('');
    const faqs = copy.faqs.map((faq) => `<dt>${esc(faq.question)}</dt><dd>${esc(faq.answer)}</dd>`).join('');
    const url = absolute(locale, slug);
    return {
      locale,
      slug,
      title: `${copy.metaTitle} | ${brand}`,
      description: copy.description,
      body: `<main class="shell"><p class="shell-eyebrow">${esc(copy.eyebrow)}</p><h1>${esc(copy.title)}</h1><p>${esc(copy.description)}</p><h2>${esc(copy.howTitle)}</h2><ol>${steps}</ol><h2>${esc(copy.faqTitle)}</h2><dl>${faqs}</dl><p><a href="${href(locale)}">${esc(landing.page.allTools)}</a></p></main>`,
      ld: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: copy.title,
          description: copy.description,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Any (web browser)',
          isAccessibleForFree: true,
          inLanguage: HTML_LANG[locale],
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          ...(url ? { url } : {}),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: copy.howTitle,
          step: copy.steps.map((step, index) => ({ '@type': 'HowToStep', position: index + 1, name: step.title, text: step.body })),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: copy.faqs.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })),
        },
        ...(site
          ? [{
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: brand, item: absolute(locale) },
                { '@type': 'ListItem', position: 2, name: copy.title, item: url },
              ],
            }]
          : []),
      ],
    };
  }

  function render(template: string, page: Page) {
    const out = template
      .replace(/<html lang="[^"]*"/, `<html lang="${HTML_LANG[page.locale]}"`)
      .replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, `<!--seo:start-->\n    ${head(page)}\n    <!--seo:end-->`)
      .replace(/<!--shell:start-->[\s\S]*?<!--shell:end-->/, `<!--shell:start-->${page.body}<!--shell:end-->`);
    if (out === template) throw new Error('prerender: index.html is missing the seo/shell markers');
    return out;
  }

  function write(file: string, content: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }

  return {
    name: 'prerender',
    apply: 'build',
    configResolved(config) {
      base = config.base;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const template = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
      const pages: Page[] = [];
      for (const locale of LOCALES) {
        pages.push(homePage(locale));
        for (const tool of FREE_TOOLS) pages.push(toolPage(locale, tool.slug));
      }
      for (const page of pages) write(path.join(outDir, pagePath(page.locale, page.slug), 'index.html'), render(template, page));

      // Unknown paths: the app shows its own "not found" page; keep it out of search results.
      const notFound = render(template, { ...homePage('en'), body: '<main class="shell"><h1>Page not found</h1></main>' })
        .replace('<!--seo:end-->', '<meta name="robots" content="noindex" />\n    <!--seo:end-->');
      write(path.join(outDir, '404.html'), notFound);

      const robots = ['User-agent: *', 'Allow: /'];
      if (site) {
        const urls = pages.map((page) => `  <url><loc>${esc(absolute(page.locale, page.slug))}</loc></url>`).join('\n');
        write(path.join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
        robots.push(`Sitemap: ${site}/sitemap.xml`);
      } else {
        this.warn('VITE_SITE_URL is not set: canonical/og:url tags and sitemap.xml were skipped.');
      }
      write(path.join(outDir, 'robots.txt'), robots.join('\n') + '\n');
      this.info?.(`prerendered ${pages.length} pages`);
    },
  };
}
