/**
 * Brand configuration. Everything a white-label fork usually changes lives here (plus `.env`).
 * Values come from Vite env vars at build time; none of them are secrets.
 */

const env = import.meta.env;

function str(value: string | undefined, fallback: string): string {
  const v = value?.trim();
  return v ? v : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === '') return fallback;
  return !['false', '0', 'no', 'off'].includes(value.trim().toLowerCase());
}

export const config = {
  brandName: str(env.VITE_BRAND_NAME, 'Open Free Tools'),
  /** Optional logo URL (absolute, or relative to the site base). Empty = built-in mark. */
  brandLogoUrl: str(env.VITE_BRAND_LOGO_URL, ''),
  /** Optional accent override (any CSS color). */
  accent: str(env.VITE_ACCENT, ''),
  /** Source code link in the header and footer. Empty hides it. */
  repoUrl: str(env.VITE_REPO_URL, 'https://github.com/coolhackboy/open-free-tools'),
  /** The small "Powered by PoYo" footer link. */
  showPoweredBy: bool(env.VITE_SHOW_POWERED_BY, true),
  poweredBy: {
    name: 'PoYo',
    url: 'https://poyo.ai/?utm_source=open-free-tools&utm_medium=app&utm_campaign=footer',
  },
} as const;

export type AppConfig = typeof config;
