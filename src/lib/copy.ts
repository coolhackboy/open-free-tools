/**
 * Page copy (titles, steps, FAQ) for every tool. Pure functions over the JSON in src/copy so the
 * prerender step (scripts/prerender.ts) and the app render exactly the same text.
 */
import { FREE_TOOLS, type FreeTool, type FreeToolCategoryId, type FreeToolKind } from '../tools/catalog.ts';

export type Locale = 'en' | 'zh';
export const LOCALES: Locale[] = ['en', 'zh'];

type Step = [string, string];
type Faq = { question: string; answer: string };
type Block = { title: string; body: string };
type Variant = { privacy: string; uses: Block[]; faqs: Faq[] };

export type FreeToolEntry = { title: string; metaTitle: string; description: string };

export type Landing = {
  index: {
    eyebrow: string;
    title: string;
    metaTitle: string;
    description: string;
    benefit: string;
    search: string;
    open: string;
    free: string;
    all: string;
    empty: string;
    shortcuts: string;
    home: string;
    crumb: string;
    faqTitle: string;
    faqs: Faq[];
  };
  page: {
    allTools: string;
    freeBadge: string;
    stepsKicker: string;
    usesKicker: string;
    featuresKicker: string;
    badges: string[];
    howTitle: string;
    useTitle: string;
    featureTitle: string;
    localTitle: string;
    faqTitle: string;
    relatedTitle: string;
    openLabel: string;
    closingTitle: string;
    file: Variant;
    input: Variant;
    net: Variant;
  };
  categories: Record<FreeToolCategoryId, string>;
  kinds: Partial<Record<FreeToolKind, Step[]>>;
  steps: Record<string, Step[]>;
  tools: Record<string, FreeToolEntry>;
  /** Public services contacted by the network tools, keyed by slug. */
  services: Record<string, string>;
};

export type CopyBlock = { title: string; body: string };

export type ToolCopy = {
  title: string;
  metaTitle: string;
  description: string;
  eyebrow: string;
  badges: string[];
  howTitle: string;
  steps: CopyBlock[];
  useTitle: string;
  uses: CopyBlock[];
  featureTitle: string;
  features: CopyBlock[];
  faqTitle: string;
  faqs: Faq[];
  relatedTitle: string;
};

/** Tools that work on typed input rather than a file. */
const INPUT_KINDS = new Set<FreeToolKind>([
  'calc', 'device', 'game', 'password', 'font', 'word', 'json', 'qr', 'barcode', 'music',
  'piano', 'guitar', 'sheet', 'sudoku', 'typing', 'whiteboard', 'mind-map', 'logo', 'lut', 'teleprompter',
  'dev', 'unit',
]);

const INPUT_SLUGS = new Set([
  'tuner', 'metronome', 'white-noise', 'text-to-speech', 'grammar-checker', 'diff-checker',
  'json-to-csv', 'html-to-pdf', 'text-to-pdf', 'gantt-chart-maker', 'gantt-chart-template',
  'project-timeline-maker', 'text-to-dxf', 'color-converter', 'hex-to-rgb', 'rgb-to-hex',
]);

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);

export function toolEntry(tool: FreeTool, landing: Landing): FreeToolEntry {
  return landing.tools[tool.slug] ?? { title: tool.title, metaTitle: tool.title, description: '' };
}

function variantFor(tool: FreeTool, landing: Landing): Variant {
  const { page } = landing;
  const service = landing.services[tool.slug];
  if (tool.kind === 'net' && service) {
    return {
      privacy: fill(page.net.privacy, { service }),
      uses: page.net.uses,
      faqs: page.net.faqs.map((faq) => ({ question: faq.question, answer: fill(faq.answer, { service }) })),
    };
  }
  return INPUT_KINDS.has(tool.kind) || INPUT_SLUGS.has(tool.slug) ? page.input : page.file;
}

export function getToolCopy(tool: FreeTool, landing: Landing): ToolCopy {
  const { page } = landing;
  const entry = toolEntry(tool, landing);
  // Display name without the "Free" prefix (every tool here is free); metaTitle keeps the search wording.
  const name = shortTitle(entry.title);
  const variant = variantFor(tool, landing);
  const steps = (landing.steps[tool.slug] ?? landing.kinds[tool.kind] ?? []).map(([title, body]) => ({ title, body }));
  return {
    title: name,
    metaTitle: entry.metaTitle || entry.title,
    description: entry.description,
    eyebrow: landing.categories[tool.category],
    badges: page.badges,
    howTitle: fill(page.howTitle, { title: name }),
    steps,
    useTitle: page.useTitle,
    uses: variant.uses,
    featureTitle: page.featureTitle,
    features: [{ title: page.localTitle, body: variant.privacy }, ...steps],
    faqTitle: fill(page.faqTitle, { title: name }),
    faqs: variant.faqs,
    relatedTitle: page.relatedTitle,
  };
}

/** Same category first, then same workspace kind, never the tool itself. */
export function relatedTools(tool: FreeTool, count = 6): FreeTool[] {
  const sameKind = FREE_TOOLS.filter((item) => item.kind === tool.kind && item.slug !== tool.slug);
  const sameCategory = FREE_TOOLS.filter((item) => item.category === tool.category && item.slug !== tool.slug && item.kind !== tool.kind);
  return [...sameKind.slice(0, 3), ...sameCategory, ...sameKind.slice(3)].slice(0, count);
}

/** Strip the leading "Free " / "免费" from catalog titles: every tool here is free. */
export function shortTitle(title: string) {
  return title.replace(/^Free\s+/i, '').replace(/^免费\s*/, '');
}

/** Root-relative path (without the deploy base) of a page. */
export function pagePath(locale: Locale, slug?: string) {
  const prefix = locale === 'en' ? '' : `${locale}/`;
  return slug ? `${prefix}tools/${slug}/` : prefix;
}
