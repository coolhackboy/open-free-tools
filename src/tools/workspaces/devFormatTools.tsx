import { useEffect, useRef, useState } from "react";
import { ActionButton, Field, SelectInput, downloadText, tx } from "@/tools/controls";
import { Area, ErrorLine, Output, Segmented, message, type DevProps } from "@/tools/workspaces/devShared";
import { markdownElement } from "@/tools/lib/markdown";

/* YAML <-> JSON ---------------------------------------------------------- */

const SAMPLE_YAML = `name: acme-app
version: 1.2.0
features:
  - search
  - free-tools
server:
  port: 8080
  tls: true
`;

const SAMPLE_JSON = `{
  "name": "acme-app",
  "version": "1.2.0",
  "features": ["search", "free-tools"],
  "server": { "port": 8080, "tls": true }
}`;

export function YamlTool({ locale, preset }: DevProps) {
  const [direction, setDirection] = useState<"yaml-json" | "json-yaml">(preset.direction === "json-yaml" ? "json-yaml" : "yaml-json");
  const [input, setInput] = useState(preset.direction === "json-yaml" ? SAMPLE_JSON : SAMPLE_YAML);
  const [indent, setIndent] = useState(2);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const handle = window.setTimeout(() => {
      import("@/tools/lib/yamlJson")
        .then(({ yamlToJson, jsonToYaml }) => {
          if (!alive) return;
          try {
            setOutput(direction === "yaml-json" ? yamlToJson(input, indent) : jsonToYaml(input, indent));
            setError("");
          } catch (reason) {
            setOutput("");
            setError(message(reason));
          }
        })
        .catch((reason) => alive && setError(message(reason)));
    }, 150);
    return () => {
      alive = false;
      window.clearTimeout(handle);
    };
  }, [direction, input, indent]);

  const toJson = direction === "yaml-json";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Segmented label={tx(locale, "Direction", "方向")} value={direction} options={[["yaml-json", "YAML → JSON"], ["json-yaml", "JSON → YAML"]]} onChange={(value) => { setDirection(value); if (output) setInput(output); }} />
        <Field label={tx(locale, "Indent", "缩进")}>
          <SelectInput value={indent} onChange={(event) => setIndent(Number(event.target.value))}>
            <option value={2}>2</option>
            <option value={4}>4</option>
          </SelectInput>
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={toJson ? "YAML" : "JSON"}><Area value={input} onChange={(event) => setInput(event.target.value)} rows={14} /></Field>
        <Output label={toJson ? "JSON" : "YAML"} value={output} locale={locale} filename={toJson ? "data.json" : "data.yaml"} type={toJson ? "application/json" : "application/yaml"} rows={14} />
      </div>
      <ErrorLine>{error}</ErrorLine>
      <p className="text-xs text-muted-foreground">{tx(locale, "YAML 1.2. Multiple documents separated by --- become a JSON array. Comments are not kept in JSON.", "按 YAML 1.2 解析。用 --- 分隔的多个文档会转成 JSON 数组。转成 JSON 后注释不会保留。")}</p>
    </div>
  );
}

/* Markdown --------------------------------------------------------------- */

const SAMPLE_MARKDOWN = `# Release notes

Open Free Tools now has **free tools** for developers.

- Base64 and URL encoders
- [x] Regex tester
- [ ] More to come

| Tool | Runs in |
| --- | --- |
| Markdown preview | Your browser |

\`\`\`js
console.log("hello");
\`\`\`

> Raw HTML such as <script> is ignored.
`;

export function MarkdownTool({ locale, preset }: DevProps) {
  const [tab, setTab] = useState<"preview" | "html">(preset.output === "html" ? "html" : "preview");
  const [input, setInput] = useState(SAMPLE_MARKDOWN);
  const [html, setHtml] = useState("");
  const preview = useRef<HTMLDivElement>(null);

  // The HTML export is read from the sanitized preview DOM after each render.
  useEffect(() => {
    setHtml(preview.current?.innerHTML.replace(/></g, ">\n<") ?? "");
  }, [input]);

  return (
    <div className="space-y-4">
      <Segmented label={tx(locale, "View", "视图")} value={tab} options={[["preview", tx(locale, "Preview", "预览")], ["html", "HTML"]]} onChange={setTab} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Markdown"><Area value={input} onChange={(event) => setInput(event.target.value)} rows={18} /></Field>
        <div className="flex min-w-0 flex-col gap-1 text-sm">
          <span className="font-medium">{tab === "preview" ? tx(locale, "Preview", "预览") : "HTML"}</span>
          <div
            ref={preview}
            hidden={tab !== "preview"}
            data-markdown-preview
            className="prose prose-sm max-w-none overflow-auto rounded-md border border-border bg-background p-4 dark:prose-invert [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-2 [&_th]:border [&_th]:border-border [&_th]:px-2"
          >
            {markdownElement(input)}
          </div>
          {tab === "html" ? <Area readOnly value={html} rows={18} data-output /> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionButton type="button" tone="quiet" disabled={!html} onClick={() => void navigator.clipboard?.writeText(html)}>{tx(locale, "Copy HTML", "复制 HTML")}</ActionButton>
        <ActionButton type="button" tone="quiet" onClick={() => downloadText(input, "document.md", "text/markdown")}>{tx(locale, "Download .md", "下载 .md")}</ActionButton>
        <ActionButton type="button" disabled={!html} onClick={() => downloadText(`<!doctype html>\n<html><head><meta charset="utf-8"><title>Document</title></head><body>\n${html}\n</body></html>\n`, "document.html", "text/html")}>{tx(locale, "Download .html", "下载 .html")}</ActionButton>
      </div>
      <p className="text-xs text-muted-foreground">{tx(locale, "GitHub-flavored Markdown: tables, task lists, strikethrough and autolinks. Raw HTML and javascript: links are removed for safety.", "支持 GitHub 风格 Markdown：表格、任务列表、删除线、自动链接。为了安全，原始 HTML 和 javascript: 链接会被移除。")}</p>
    </div>
  );
}

/* SQL -------------------------------------------------------------------- */

const SAMPLE_SQL = "select u.id, u.name, count(o.id) as orders from users u left join orders o on o.user_id = u.id where u.created_at >= '2026-01-01' and u.status in ('active','trial') group by u.id, u.name having count(o.id) > 2 order by orders desc limit 20;";

const DIALECTS: [string, string][] = [
  ["sql", "Standard SQL"],
  ["mysql", "MySQL"],
  ["postgresql", "PostgreSQL"],
  ["sqlite", "SQLite"],
  ["transactsql", "SQL Server (T-SQL)"],
  ["plsql", "Oracle PL/SQL"],
  ["bigquery", "BigQuery"],
  ["snowflake", "Snowflake"],
  ["mariadb", "MariaDB"],
  ["redshift", "Redshift"],
  ["spark", "Spark SQL"],
  ["duckdb", "DuckDB"],
];

export function SqlTool({ locale }: DevProps) {
  const [input, setInput] = useState(SAMPLE_SQL);
  const [dialect, setDialect] = useState("sql");
  const [keywordCase, setKeywordCase] = useState<"upper" | "lower" | "preserve">("upper");
  const [tabWidth, setTabWidth] = useState(2);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const { formatSql } = await import("@/tools/lib/sqlFormat");
      setOutput(formatSql(input, dialect as Parameters<typeof formatSql>[1], keywordCase, tabWidth));
      setError("");
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={tx(locale, "Dialect", "方言")}>
          <SelectInput value={dialect} onChange={(event) => setDialect(event.target.value)}>
            {DIALECTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </SelectInput>
        </Field>
        <Field label={tx(locale, "Keywords", "关键字")}>
          <SelectInput value={keywordCase} onChange={(event) => setKeywordCase(event.target.value as typeof keywordCase)}>
            <option value="upper">{tx(locale, "UPPERCASE", "大写")}</option>
            <option value="lower">{tx(locale, "lowercase", "小写")}</option>
            <option value="preserve">{tx(locale, "Keep as typed", "保持原样")}</option>
          </SelectInput>
        </Field>
        <Field label={tx(locale, "Indent", "缩进")}>
          <SelectInput value={tabWidth} onChange={(event) => setTabWidth(Number(event.target.value))}>
            <option value={2}>2</option>
            <option value={4}>4</option>
          </SelectInput>
        </Field>
        <ActionButton type="button" data-action="run" disabled={busy} onClick={() => void run()}>{tx(locale, "Format SQL", "格式化 SQL")}</ActionButton>
      </div>
      <Field label="SQL"><Area value={input} onChange={(event) => setInput(event.target.value)} rows={8} /></Field>
      <ErrorLine>{error}</ErrorLine>
      <Output label={tx(locale, "Formatted SQL", "格式化结果")} value={output} locale={locale} filename="query.sql" type="application/sql" rows={14} />
    </div>
  );
}
