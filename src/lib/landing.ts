import { useEffect, useState } from 'react';
import en from '@/copy/en.json';
import type { Landing, Locale } from './copy';

/** English ships with the app bundle; Chinese is a separate chunk loaded on first use. */
const cache: Partial<Record<Locale, Landing>> = { en: en as unknown as Landing };
let zhPromise: Promise<Landing> | null = null;

export function loadLanding(locale: Locale): Promise<Landing> {
  const hit = cache[locale];
  if (hit) return Promise.resolve(hit);
  zhPromise ??= import('@/copy/zh.json')
    .then((mod) => {
      const value = mod.default as unknown as Landing;
      cache.zh = value;
      return value;
    })
    .catch((error) => {
      zhPromise = null;
      throw error;
    });
  return zhPromise;
}

/** Copy for a locale. Falls back to English while (or if) the other locale loads. */
export function useLanding(locale: Locale): { landing: Landing; ready: boolean } {
  const [, force] = useState(0);
  const hit = cache[locale];
  useEffect(() => {
    if (cache[locale]) return;
    let alive = true;
    loadLanding(locale).then(
      () => alive && force((n) => n + 1),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [locale]);
  return { landing: hit ?? (cache.en as Landing), ready: Boolean(hit) };
}
