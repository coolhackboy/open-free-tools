import { useState, useSyncExternalStore, type ReactNode, type TextareaHTMLAttributes } from "react";
import { ActionButton, Field, downloadText, tx } from "@/tools/controls";

export type DevProps = { locale: string; preset: Record<string, string> };

export function Area({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      spellCheck={false}
      {...props}
      className={["min-h-40 w-full resize-y rounded-md border border-input bg-background p-3 font-mono text-sm leading-relaxed", className].filter(Boolean).join(" ")}
    />
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" className="h-4 w-4 accent-accent-ink" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (value: T) => void }) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-0.5 rounded-lg border border-border bg-background p-0.5">
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={["rounded-md px-3 py-1.5 text-small font-semibold", value === id ? "bg-accent text-accent-fg" : "text-muted-foreground hover:text-foreground"].join("")}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({ text, locale }: { text: string; locale: string }) {
  const [done, setDone] = useState(false);
  return (
    <ActionButton
      type="button"
      tone="quiet"
      disabled={!text}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1200);
        });
      }}
    >
      {done ? tx(locale, "Copied", "已复制") : tx(locale, "Copy", "复制")}
    </ActionButton>
  );
}

export function ErrorLine({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{children}</p>;
}

export function Output({ label, value, locale, filename, type = "text/plain", rows }: { label: string; value: string; locale: string; filename?: string; type?: string; rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <Field label={label}>
        <Area readOnly value={value} rows={rows} data-output />
      </Field>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={value} locale={locale} />
        {filename ? (
          <ActionButton type="button" tone="quiet" disabled={!value} onClick={() => downloadText(value, filename, type)}>
            {tx(locale, "Download", "下载")}
          </ActionButton>
        ) : null}
      </div>
    </div>
  );
}

export function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/* Current time without hydration mismatch: null on the server and during hydration, then ticks every second. */
let nowValue = 0;
let nowTimer: ReturnType<typeof setInterval> | null = null;
const nowListeners = new Set<() => void>();

function subscribeNow(listener: () => void) {
  nowListeners.add(listener);
  if (nowTimer === null) {
    nowValue = Date.now();
    nowTimer = setInterval(() => {
      nowValue = Date.now();
      nowListeners.forEach((item) => item());
    }, 1000);
    queueMicrotask(() => nowListeners.forEach((item) => item()));
  }
  return () => {
    nowListeners.delete(listener);
    if (!nowListeners.size && nowTimer !== null) {
      clearInterval(nowTimer);
      nowTimer = null;
    }
  };
}

export function useNow(): number | null {
  return useSyncExternalStore(subscribeNow, () => nowValue || null, () => null);
}

const subscribeNothing = () => () => {};

/** true only after hydration; use for values that must differ between server and browser (random ids, local time zone). */
export function useHydrated() {
  return useSyncExternalStore(subscribeNothing, () => true, () => false);
}
