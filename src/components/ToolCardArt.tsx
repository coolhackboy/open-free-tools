import type { FreeToolKind } from "@/tools/catalog";
import { coverFor } from "@/tools/cardArt";

const FONTS = {
  sans: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

/** Generated cover art for a tool card (pure SVG, no images). */
export function ToolCardArt({ kind, slug, className = "" }: { kind: FreeToolKind; slug: string; className?: string }) {
  const { background, marks } = coverFor(kind, slug);
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundColor: background }}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
        <rect width="200" height="200" fill={background} />
        {marks.map((mark, index) => {
          if (mark.t === "c") {
            return <circle key={index} cx={mark.x} cy={mark.y} r={mark.r} fill={mark.f} stroke={mark.s} strokeWidth={mark.sw} opacity={mark.o} />;
          }
          if (mark.t === "p") {
            return (
              <path
                key={index}
                d={mark.d}
                fill={mark.f ?? "none"}
                stroke={mark.s}
                strokeWidth={mark.w}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={mark.o}
              />
            );
          }
          if (mark.t === "t") {
            return (
              <text
                key={index}
                x={mark.x}
                y={mark.y}
                fontSize={mark.z}
                fill={mark.f}
                fontWeight={mark.w ?? 800}
                fontStyle={mark.st}
                fontFamily={FONTS[mark.ff ?? "sans"]}
                textAnchor={mark.a ?? "middle"}
              >
                {mark.v}
              </text>
            );
          }
          return <rect key={index} x={mark.x} y={mark.y} width={mark.w} height={mark.h} rx={mark.rx} fill={mark.f} stroke={mark.s} strokeWidth={mark.sw} opacity={mark.o} />;
        })}
      </svg>
    </div>
  );
}
