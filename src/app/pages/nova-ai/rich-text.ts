// Markdown ligero de NovaAI → HTML con clases de Tailwind.
// Primero se escapa todo el HTML: lo que venga del modelo nunca se interpreta como código.

import { prettyDate } from '../../shared/utils/pretty-date';
import { apartmentColor, apartmentShortName } from '../../shared/utils/apartment-color';

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

// ── Tarjetas de reserva ────────────────────────────────────────────────
// Un ítem de lista con nombre, entrada y salida (YYYY-MM-DD) y estado o monto
// se muestra como tarjeta. NovaAI las escribe así:
//   - **Huésped** | Apartamento | 2026-11-07 | 2026-11-08 | PENDIENTE | $350.000 | Booking

// Paleta de apartment-color → clases (el sanitizer de Angular quita los style="")
const APT_CLASS: Record<string, { bar: string; text: string }> = {
  '#2DD4BF': { bar: 'bg-teal-400', text: 'text-teal-300' },
  '#A78BFA': { bar: 'bg-violet-400', text: 'text-violet-300' },
  '#38BDF8': { bar: 'bg-sky-400', text: 'text-sky-300' },
  '#FB923C': { bar: 'bg-orange-400', text: 'text-orange-300' },
  '#F472B6': { bar: 'bg-pink-400', text: 'text-pink-300' },
  '#A3E635': { bar: 'bg-lime-400', text: 'text-lime-300' },
};
const APT_NONE = { bar: 'bg-brand', text: 'text-text-secondary' };
const PLATFORM_DOT: Record<string, string> = {
  booking: 'bg-blue-400',
  airbnb: 'bg-rose-400',
  directo: 'bg-brand',
};

const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const ISO_RE = /\b(\d{4})-(\d{2})-(\d{2})(?:T[\d:.]+Z?)?\b/g;
const STATUS_RE = /\b(FALTA PAGO|NO SHOW|PAGADO|PENDIENTE|CHECK-IN|CHECK-OUT)\b/g;
const MONEY_RE = /\$\s?\d{1,3}(?:\.\d{3})+(?:,\d+)?|\$\s?\d+(?:,\d+)?/;
const PLATFORM_RE = /\b(Booking|AirBnB|Airbnb|Directo)\b/i;

interface BookingCard {
  guest: string;
  apartment?: string;
  checkIn: Date;
  checkOut: Date;
  statuses: string[];
  amount?: string;
  platform?: string;
  note?: string;
}

const utc = (m: RegExpMatchArray) => new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));

function parseBooking(raw: string): BookingCard | null {
  const dates = [...raw.matchAll(ISO_RE)];
  if (dates.length < 2) return null;
  const checkIn = utc(dates[0]);
  const checkOut = utc(dates[1]);
  const nights = (checkOut.getTime() - checkIn.getTime()) / 86_400_000;
  if (!(nights >= 1 && nights <= 60)) return null;

  const statuses = [...new Set([...raw.matchAll(STATUS_RE)].map((m) => m[0]))];
  const amount = MONEY_RE.exec(raw)?.[0].replace(/\s/, '');
  if (!statuses.length && !amount) return null;
  const platform = PLATFORM_RE.exec(raw)?.[0];

  // Lo que queda tras quitar fechas, estados, monto y plataforma: huésped, apartamento y notas
  const bold = /^\s*\*\*(.+?)\*\*\s*:?/.exec(raw);
  let rest = bold ? raw.slice(bold[0].length) : raw;
  rest = rest
    .replace(ISO_RE, '|')
    .replace(STATUS_RE, '|')
    .replace(MONEY_RE, '|')
    .replace(PLATFORM_RE, '|')
    .replace(/\b(al|a|→|->|hasta|del|de)\b(?=\s*\|)/gi, '|');
  const parts = rest
    .split(/\s*[|:·,–—]\s*/)
    .map((p) => p.replace(/\*\*/g, '').trim())
    .filter((p) => /[\p{L}\d]/u.test(p) && !/^(al|a|→|del|de|y|hasta)$/i.test(p))
    // "(Sábado a domingo)" sobra: la tarjeta ya muestra los días
    .filter((p) => /[\p{L}\d]/u.test(p.replace(/lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|\b(a|al|y)\b/gi, '')));

  const guest = bold?.[1] ?? parts.shift();
  if (!guest) return null;
  const aptIdx = parts.findIndex((p) => /apartamento|apto/i.test(p));
  const apartment = aptIdx >= 0 ? parts.splice(aptIdx, 1)[0] : parts.shift();
  return { guest, apartment, checkIn, checkOut, statuses, amount, platform, note: parts.join(' · ') || undefined };
}

function dayBox(label: string, d: Date): string {
  return (
    `<div class="flex-1 min-w-0 rounded-lg bg-bg/60 border border-border px-2.5 py-1.5">` +
    `<p class="text-[0.65rem] uppercase tracking-wider text-text-disabled">${label}</p>` +
    `<p class="text-text-primary font-semibold whitespace-nowrap">${DAY_SHORT[d.getUTCDay()]} ${d.getUTCDate()} <span class="text-sky-300">${MONTH_SHORT[d.getUTCMonth()]}</span></p>` +
    `</div>`
  );
}

function bookingCard(b: BookingCard, aptIds: Map<string, string>): string {
  const aptId = b.apartment ? aptIds.get(apartmentShortName(b.apartment).toLowerCase()) : undefined;
  const apt = aptId ? (APT_CLASS[apartmentColor(aptId)] ?? APT_NONE) : APT_NONE;
  const nights = Math.round((b.checkOut.getTime() - b.checkIn.getTime()) / 86_400_000);
  const platformKey = b.platform?.toLowerCase();

  return (
    `<div class="relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-elevated to-surface p-3.5 pl-5 text-[0.9em] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">` +
    `<span class="absolute left-0 inset-y-0 w-1 ${apt.bar}"></span>` +
    // Huésped + estado
    `<div class="flex items-start justify-between gap-2">` +
    `<div class="min-w-0">` +
    `<p class="font-semibold text-text-primary leading-snug">${inline(b.guest)}</p>` +
    (b.apartment
      ? `<p class="mt-0.5 flex items-center gap-1.5 text-xs ${apt.text}"><span class="w-1.5 h-1.5 rounded-full shrink-0 ${apt.bar}"></span>${escape(apartmentShortName(b.apartment))}</p>`
      : '') +
    `</div>` +
    `<div class="flex flex-col items-end gap-1 shrink-0">${b.statuses
      .map((st) => `<span class="px-1.5 py-px rounded-md border text-[0.7rem] font-semibold tracking-wide whitespace-nowrap ${STATUS_CLASS[st]}">${st}</span>`)
      .join('')}</div>` +
    `</div>` +
    // Entrada → salida
    `<div class="mt-3 flex items-center gap-2 text-xs">` +
    dayBox('Entrada', b.checkIn) +
    `<div class="shrink-0 flex flex-col items-center text-text-disabled"><span class="text-[0.65rem] whitespace-nowrap">${nights} ${nights === 1 ? 'noche' : 'noches'}</span><span class="leading-none">→</span></div>` +
    dayBox('Salida', b.checkOut) +
    `</div>` +
    // Plataforma + total
    `<div class="mt-3 flex items-end justify-between gap-2">` +
    (b.platform
      ? `<span class="flex items-center gap-1.5 text-xs text-text-secondary"><span class="w-2 h-2 rounded-full ${PLATFORM_DOT[platformKey!] ?? 'bg-text-disabled'}"></span>${escape(b.platform)}</span>`
      : `<span></span>`) +
    (b.amount ? `<span class="text-lg font-bold text-brand tabular-nums leading-none">${b.amount}</span>` : '') +
    `</div>` +
    (b.note ? `<p class="mt-2 text-xs text-text-disabled">${inline(b.note)}</p>` : '') +
    `</div>`
  );
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isTableSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

// apartments: id → nombre, para pintar cada tarjeta con el color de su apartamento
export function renderRich(text: string, apartments: Record<string, string> = {}): string {
  const aptIds = new Map(Object.entries(apartments).map(([id, name]) => [apartmentShortName(name).toLowerCase(), id]));
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
      // Reservas seguidas → grilla de tarjetas; el resto, lista normal
      let n = 0;
      for (let j = 0; j < items.length; ) {
        const cards: BookingCard[] = [];
        let b: BookingCard | null;
        while (j < items.length && (b = parseBooking(items[j]))) {
          cards.push(b);
          j++;
        }
        if (cards.length) {
          out.push(
            `<div class="my-2.5 grid gap-2.5 ${cards.length > 1 ? 'sm:grid-cols-2' : 'sm:max-w-sm'}">${cards.map((c) => bookingCard(c, aptIds)).join('')}</div>`,
          );
          continue;
        }
        const plain: string[] = [];
        while (j < items.length && !parseBooking(items[j])) plain.push(items[j++]);
        out.push(
          `<ul class="my-1.5 space-y-1">${plain
            .map(
              (it) =>
                `<li class="flex gap-2.5">${
                  ordered
                    ? `<span class="shrink-0 w-5 h-5 mt-px rounded-full bg-brand/15 text-brand text-[0.7em] font-bold flex items-center justify-center">${++n}</span>`
                    : `<span class="shrink-0 w-1.5 h-1.5 mt-[0.55em] rounded-full bg-brand"></span>`
                }<span class="min-w-0">${inline(it)}</span></li>`,
            )
            .join('')}</ul>`,
        );
      }
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
