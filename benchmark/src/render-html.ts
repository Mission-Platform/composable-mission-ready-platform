import type { BenchmarkReport } from "./contracts.ts";
import { renderMarkdown } from "./render-markdown.ts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.startsWith("# ")) {
      html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith("## ")) {
      html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("| ")) {
      const rows: string[][] = [];
      while (lines[index]?.startsWith("| ") === true) {
        const row = lines[index] ?? "";
        if (!/^\|\s*-+/.test(row)) {
          rows.push(
            row
              .split("|")
              .slice(1, -1)
              .map((cell) => cell.trim()),
          );
        }
        index += 1;
      }
      index -= 1;
      const [header, ...body] = rows;
      if (header !== undefined) {
        html.push(
          `<table><thead><tr>${header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`,
        );
      }
      continue;
    }
    if (line.startsWith("- ")) {
      html.push(`<li>${escapeHtml(line.slice(2))}</li>`);
      continue;
    }
    if (line.trim() !== "") html.push(`<p>${escapeHtml(line)}</p>`);
  }
  return html.join("\n");
}

export function renderHtml(report: BenchmarkReport): string {
  const body = markdownToHtml(renderMarkdown(report));
  const performanceGateStatus =
    report.performanceGates === undefined
      ? "not-requested"
      : report.performanceGates.failed
        ? "failed"
        : "passed";
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Forge Web Script Benchmark</title>\n<style>body{font:14px system-ui,sans-serif;max-width:1200px;margin:2rem auto;padding:0 1rem;color:#202124}h1,h2{margin-top:2rem}li{margin:.25rem 0}p{white-space:pre-wrap;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;margin:1rem 0}th,td{border:1px solid #d0d7de;padding:.35rem;text-align:left;vertical-align:top}th{background:#f6f8fa}code{font-family:ui-monospace,monospace}</style>\n</head>\n<body data-performance-gate="${performanceGateStatus}">\n${body}\n</body>\n</html>\n`;
}
