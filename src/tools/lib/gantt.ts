export type GanttTask = { name: string; start: number; days: number };

export function ganttSvg(tasks: GanttTask[], title = "Schedule"): string {
  const width = 720;
  const height = 72 + tasks.length * 36;
  const rows = tasks
    .map((task, index) => {
      const y = 56 + index * 36;
      const x = 160 + task.start * 28;
      const w = Math.max(12, task.days * 28);
      const safe = escapeXml(task.name);
      return `<text x="16" y="${y + 16}" font-family="sans-serif" font-size="14">${safe}</text><rect x="${x}" y="${y}" width="${w}" height="22" rx="4" fill="#d4ff00" stroke="#111"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fff"/><text x="16" y="28" font-family="sans-serif" font-size="18" font-weight="700">${escapeXml(title)}</text>${rows}</svg>`;
}

export function timelineSvg(events: { label: string; when: string }[]): string {
  const width = 760;
  const height = 180;
  const marks = events
    .map((event, index) => {
      const x = 60 + index * ((width - 120) / Math.max(1, events.length - 1));
      return `<line x1="${x}" y1="70" x2="${x}" y2="96" stroke="#111"/><circle cx="${x}" cy="78" r="7" fill="#d4ff00" stroke="#111"/><text x="${x}" y="120" text-anchor="middle" font-family="sans-serif" font-size="13">${escapeXml(event.label)}</text><text x="${x}" y="140" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#555">${escapeXml(event.when)}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fff"/><line x1="40" y1="78" x2="${width - 40}" y2="78" stroke="#111" stroke-width="2"/>${marks}</svg>`;
}

function escapeXml(value: string) {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
}
