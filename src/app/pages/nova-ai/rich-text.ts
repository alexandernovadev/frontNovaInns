// Markdown ligero de NovaAI → HTML con clases de Tailwind.
// Primero se escapa todo el HTML: lo que venga del modelo nunca se interpreta como código.

import { prettyDate } from '../../shared/utils/pretty-date';

const STATUS_CLASS: Record<string, string> = {
  PAGADO: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'FALTA PAGO': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'NO SHOW': 'bg-red-500/15 text-red-400 border-red-500/30',
  PENDIENTE: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'CHECK-IN': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'CHECK-OUT': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};
const PLATFORM_CLASS: Record<string, string> = {
  booking: 'text-blue-400',
  airbnb: 'text-rose-400',
  directo: 'text-brand',
};

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(raw: string): string {
  let s = escape(raw);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary font-semibold">$1</strong>');
  s = s.replace(/(^|[\s(])_(?!_)(.+?)_(?=[\s).,;:!?]|$)/g, '$1<em class="text-text-secondary">$2</em>');
  s = s.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-bg border border-border text-[0.8em] text-brand-accent font-mono">$1</code>');
  // Fechas: NovaAI las escribe como YYYY-MM-DD y aquí se muestran con el día de la semana
  s = s.replace(/\b\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?\b/g, (m) => {
    const pretty = prettyDate(m);
    return pretty
      ? `<span class="inline-flex items-center px-1.5 py-px rounded-md bg-sky-500/10 text-sky-300 font-medium whitespace-nowrap">${pretty}</span>`
      : m;
  });
  // Montos: $1.234.567
  s = s.replace(
    /\$\s?\d{1,3}(?:\.\d{3})+(?:,\d+)?|\$\s?\d+(?:,\d+)?/g,
    (m) => `<span class="font-semibold text-brand tabular-nums whitespace-nowrap">${m.replace(/\s/, '')}</span>`,
  );
  // Estados de pago y de estadía
  s = s.replace(
    /\b(FALTA PAGO|NO SHOW|PAGADO|PENDIENTE|CHECK-IN|CHECK-OUT)\b/g,
    (m) => `<span class="inline-block px-1.5 py-px rounded-md border text-[0.75em] font-semibold tracking-wide align-middle whitespace-nowrap ${STATUS_CLASS[m]}">${m}</span>`,
  );
  // Plataformas
  s = s.replace(
    /\b(Booking|AirBnB|Airbnb|Directo)\b/g,
    (m) => `<span class="font-semibold ${PLATFORM_CLASS[m.toLowerCase()]}">${m}</span>`,
  );
  return s;
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isTableSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

export function renderRich(text: string): string {
  const lines = text.replace(/\r/g, '').split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Tabla: | a | b |  +  |---|---|
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
      out.push(
        `<div class="my-2 overflow-x-auto rounded-xl border border-border"><table class="w-full text-[0.85em] border-collapse">` +
          `<thead><tr>${head.map((h) => `<th class="px-3 py-2 text-left font-semibold text-brand bg-brand/10 whitespace-nowrap">${inline(h)}</th>`).join('')}</tr></thead>` +
          `<tbody>${rows
            .map(
              (r, ri) =>
                `<tr class="${ri % 2 ? 'bg-white/[0.02]' : ''}">${r.map((c) => `<td class="px-3 py-1.5 border-t border-border text-text-secondary">${inline(c)}</td>`).join('')}</tr>`,
            )
            .join('')}</tbody></table></div>`,
      );
      continue;
    }

    // Títulos: ### Algo
    const h = /^\s*#{1,4}\s+(.+)$/.exec(line);
    if (h) {
      out.push(`<p class="mt-3 first:mt-0 mb-1 text-[0.8em] font-bold uppercase tracking-widest text-brand">${inline(h[1])}</p>`);
      i++;
      continue;
    }

    // Listas: - item  /  1. item
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ''));
        i++;
      }
      out.push(
        `<ul class="my-1.5 space-y-1">${items
          .map(
            (it, n) =>
              `<li class="flex gap-2.5">${
                ordered
                  ? `<span class="shrink-0 w-5 h-5 mt-px rounded-full bg-brand/15 text-brand text-[0.7em] font-bold flex items-center justify-center">${n + 1}</span>`
                  : `<span class="shrink-0 w-1.5 h-1.5 mt-[0.55em] rounded-full bg-brand"></span>`
              }<span class="min-w-0">${inline(it)}</span></li>`,
          )
          .join('')}</ul>`,
      );
      continue;
    }

    // Párrafo: líneas seguidas hasta una vacía
    if (line.trim()) {
      const para: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^\s*#{1,4}\s+/.test(lines[i]) &&
        !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i]) &&
        !isTableRow(lines[i])
      )
        para.push(inline(lines[i++]));
      out.push(`<p class="my-1.5 first:mt-0 last:mb-0">${para.join('<br>')}</p>`);
      continue;
    }
    i++;
  }
  return out.join('');
}
