import { useMemo } from 'react';
import { FREE_TOOLS } from '@/tools/catalog';
import { toolEntry, type Landing } from './copy';
import { buildIndex, type SearchDoc } from './search';

/** Search index over every tool, in the page language plus both catalog titles. */
export function useSearchIndex(landing: Landing) {
  return useMemo(() => {
    const docs: SearchDoc[] = FREE_TOOLS.map((tool) => {
      const entry = toolEntry(tool, landing);
      return {
        tool,
        title: entry.title,
        alt: [tool.title, tool.titleZh, entry.metaTitle, tool.slug, tool.kind, landing.categories[tool.category]].join(' '),
        description: entry.description,
      };
    });
    return buildIndex(docs);
  }, [landing]);
}
