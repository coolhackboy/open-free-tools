// Regenerates the tool list in README.md (between the tools:start / tools:end markers) and the tool count.
// Usage: npm run readme:tools
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

const catalog = read('src/tools/catalog.ts');
const copy = JSON.parse(read('src/copy/en.json'));
const categories = [...catalog.matchAll(/\{ id: "([^"]+)" \}/g)].map((m) => m[1]);
const tools = [...catalog.matchAll(/^\s*tool\("([^"]+)",\s*"([^"]+)"/gm)].map((m) => ({ slug: m[1], category: m[2] }));

const site = 'https://coolhackboy.github.io/open-free-tools';
const title = (slug) => (copy.tools[slug]?.title ?? slug).replace(/^Free\s+/i, '');

const sections = categories.map((category) => {
  const group = tools.filter((tool) => tool.category === category);
  const links = group.map((tool) => `[${title(tool.slug)}](${site}/tools/${tool.slug}/)`).join(' · ');
  return `<details>\n<summary><b>${copy.categories[category]}</b> (${group.length})</summary>\n\n${links}\n\n</details>`;
});

let readme = read('README.md');
readme = readme.replace(/<!-- tools:start -->[\s\S]*?<!-- tools:end -->/, `<!-- tools:start -->\n${sections.join('\n\n')}\n<!-- tools:end -->`);
readme = readme.replace(/<!-- tools-count -->\d+<!-- \/tools-count -->/g, `<!-- tools-count -->${tools.length}<!-- /tools-count -->`);
fs.writeFileSync(new URL('README.md', root), readme);
console.log(`README: ${tools.length} tools in ${categories.length} categories`);
