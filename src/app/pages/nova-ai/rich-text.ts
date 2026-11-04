// Markdown ligero de NovaAI → HTML con clases globales .rt-* (src/styles/rich-text.css).
// Primero se escapa todo el HTML: lo que venga del modelo nunca se interpreta como código.

import { prettyDate } from '../../shared/utils/pretty-date';
import { apartmentColor, apartmentShortName } from '../../shared/utils/apartment-color';

// Tonos del sistema (tint-* fija --c / --c-soft)
const STATUS_CLASS: Record<string, string> = {
  PAGADO: 'tint-mint',
  'FALTA PAGO': 'tint-peach',
  'NO SHOW': 'tint-rose',
  PENDIENTE: 'tint-sky',
  'CHECK-IN': 'tint-mint',
  'CHECK-OUT': 'tint-lilac',
};
const PLATFORM_CLASS: Record<string, string> = {
  booking: 'tint-sky',
  airbnb: 'tint-rose',
  directo: 'tint-butter',
};

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(raw: string): string {
  let s = escape(raw);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])_(?!_)(.+?)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Fechas: NovaAI las escribe como YYYY-MM-DD y aquí se muestran con el día de la semana
  s = s.replace(/\b\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?\b/g, (m) => {
    const pretty = prettyDate(m);
    return pretty
      ? `<span class="rt-date">${pretty}</span>`
      : m;
  });
  // Montos: $1.234.567
  s = s.replace(
    /\$\s?\d{1,3}(?:\.\d{3})+(?:,\d+)?|\$\s?\d+(?:,\d+)?/g,
    (m) => `<span class="rt-money">${m.replace(/\s/, '')}</span>`,
  );
  // Estados de pago y de estadía
  s = s.replace(
    /\b(FALTA PAGO|NO SHOW|PAGADO|PENDIENTE|CHECK-IN|CHECK-OUT)\b/g,
    (m) => `<span class="rt-status ${STATUS_CLASS[m]}">${m}</span>`,
  );
  // Plataformas
  s = s.replace(
    /\b(Booking|AirBnB|Airbnb|Directo)\b/g,
    (m) => `<span class="rt-platform ${PLATFORM_CLASS[m.toLowerCase()]}">${m}</span>`,
  );
  return s;
}

// ── Tarjetas de reserva ────────────────────────────────────────────────
// Un ítem de lista con nombre, entrada y salida (YYYY-MM-DD) y estado o monto
// se muestra como tarjeta. NovaAI las escribe así:
//   - **Huésped** | Apartamento | 2026-11-07 | 2026-11-08 | PENDIENTE | $350.000 | Booking

// Paleta de apartment-color → tint (el sanitizer de Angular quita los style="")
const APT_CLASS: Record<string, string> = {
  '#91debc': 'tint-mint',
  '#cbbdf9': 'tint-lilac',
  '#9bd2fa': 'tint-sky',
  '#f9bb92': 'tint-peach',
  '#f6b2b9': 'tint-rose',
  '#ecdc92': 'tint-butter',
};
const APT_NONE = 'tint-butter';

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
    `<div class="rt-day">` +
    `<p class="rt-day-label">${label}</p>` +
    `<p class="rt-day-value">${DAY_SHORT[d.getUTCDay()]} ${d.getUTCDate()} <span>${MONTH_SHORT[d.getUTCMonth()]}</span></p>` +
    `</div>`
  );
}

function bookingCard(b: BookingCard, aptIds: Map<string, string>): string {
  const aptId = b.apartment ? aptIds.get(apartmentShortName(b.apartment).toLowerCase()) : undefined;
  const apt = aptId ? (APT_CLASS[apartmentColor(aptId)] ?? APT_NONE) : APT_NONE;
  const nights = Math.round((b.checkOut.getTime() - b.checkIn.getTime()) / 86_400_000);
  const platformKey = b.platform?.toLowerCase();

  return (
    `<div class="rt-card ${apt}">` +
    // Huésped + estado
    `<div class="rt-card-head">` +
    `<div class="rt-card-who">` +
    `<p class="rt-guest">${inline(b.guest)}</p>` +
    (b.apartment ? `<p class="rt-apt"><i></i>${escape(apartmentShortName(b.apartment))}</p>` : '') +
    `</div>` +
    `<div class="rt-statuses">${b.statuses.map((st) => `<span class="rt-status ${STATUS_CLASS[st]}">${st}</span>`).join('')}</div>` +
    `</div>` +
    // Entrada → salida
    `<div class="rt-stay">` +
    dayBox('Entrada', b.checkIn) +
    `<div class="rt-nights"><span>${nights} ${nights === 1 ? 'noche' : 'noches'}</span><span>→</span></div>` +
    dayBox('Salida', b.checkOut) +
    `</div>` +
    // Plataforma + total
    `<div class="rt-card-foot">` +
    (b.platform
      ? `<span class="rt-plat ${PLATFORM_CLASS[platformKey!] ?? 'tint-neutral'}"><i></i>${escape(b.platform)}</span>`
      : `<span></span>`) +
    (b.amount ? `<span class="rt-total">${b.amount}</span>` : '') +
    `</div>` +
    (b.note ? `<p class="rt-note">${inline(b.note)}</p>` : '') +
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
        `<div class="rt-table"><table>` +
          `<thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead>` +
          `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
      );
      continue;
    }

    // Títulos: ### Algo
    const h = /^\s*#{1,4}\s+(.+)$/.exec(line);
    if (h) {
      out.push(`<p class="rt-h">${inline(h[1])}</p>`);
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
            `<div class="rt-cards${cards.length > 1 ? '' : ' one'}">${cards.map((c) => bookingCard(c, aptIds)).join('')}</div>`,
          );
          continue;
        }
        const plain: string[] = [];
        while (j < items.length && !parseBooking(items[j])) plain.push(items[j++]);
        out.push(
          `<ul class="rt-list">${plain
            .map((it) => `<li>${ordered ? `<b class="rt-n">${++n}</b>` : `<i class="rt-bullet"></i>`}<span>${inline(it)}</span></li>`)
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
      out.push(`<p class="rt-p">${para.join('<br>')}</p>`);
      continue;
    }
    i++;
  }
  return out.join('');
}
