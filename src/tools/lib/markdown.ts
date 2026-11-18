import { createElement } from "react";
import Markdown, { type Options } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Shared Markdown settings for markdown-preview / markdown-to-html.
 * skipHtml drops raw HTML from the source and react-markdown's default urlTransform
 * strips javascript:/data: links, so the preview DOM (and the HTML exported from it) is safe.
 */
export const MARKDOWN_OPTIONS: Options = { remarkPlugins: [remarkGfm], skipHtml: true };

export function markdownElement(source: string) {
  return createElement(Markdown, MARKDOWN_OPTIONS, source);
}
