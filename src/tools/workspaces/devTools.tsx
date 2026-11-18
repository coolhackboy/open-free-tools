import type { FreeTool } from "@/tools/catalog";
import { toolMode } from "@/tools/catalog";
import { ToolPanel } from "@/tools/controls";
import { Base64Tool, EntityTool, HashTool, JwtTool, UrlTool, UuidTool } from "@/tools/workspaces/devEncodeTools";
import { BaseTool, CaseTool, CronTool, LinesTool, LoremTool, RegexTool, TimestampTool } from "@/tools/workspaces/devTextTools";
import { MarkdownTool, SqlTool, YamlTool } from "@/tools/workspaces/devFormatTools";
import type { DevProps } from "@/tools/workspaces/devShared";
import type { ComponentType } from "react";

type Props = { tool: FreeTool; locale: string };

const DEV_MODES: Record<string, ComponentType<DevProps>> = {
  base64: Base64Tool,
  url: UrlTool,
  entity: EntityTool,
  uuid: UuidTool,
  hash: HashTool,
  jwt: JwtTool,
  regex: RegexTool,
  case: CaseTool,
  lorem: LoremTool,
  dedupe: LinesTool,
  sort: LinesTool,
  timestamp: TimestampTool,
  cron: CronTool,
  base: BaseTool,
  yaml: YamlTool,
  markdown: MarkdownTool,
  sql: SqlTool,
};

export function DevTool({ tool, locale }: Props) {
  const Mode = DEV_MODES[toolMode(tool)] ?? Base64Tool;
  return (
    <ToolPanel>
      <Mode locale={locale} preset={tool.preset} />
    </ToolPanel>
  );
}
