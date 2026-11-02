import { fmtNumber } from '../../shared/utils/number.util';

// Nombre legible de cada campo que NovaAI puede cambiar (tarjetas e historial)
const FIELD_LABELS: Record<string, string> = {
  'group.host.fullName': 'Huésped',
  'group.host.location.countryName': 'País',
  'group.members': 'Acompañantes',
  apartmentId: 'Apartamento',
  'stay.checkIn': 'Entrada',
  'stay.checkOut': 'Salida',
  'stay.status': 'Estadía',
  'billing.basePrice': 'Precio base',
  'billing.extraServices': 'Servicios extra',
  'billing.totalAmount': 'Total',
  'billing.amountReceived': 'Recibido',
  'billing.platform': 'Plataforma',
  'billing.paymentMethod': 'Método de pago',
  'billing.status': 'Estado de pago',
  observations: 'Observaciones',
  internalName: 'Nombre',
  status: 'Estado',
  description: 'Descripción',
  amount: 'Monto',
  category: 'Categoría',
  date: 'Fecha',
  paymentMethod: 'Método de pago',
  notes: 'Notas',
};
const MONEY_FIELDS = new Set(['billing.basePrice', 'billing.totalAmount', 'billing.amountReceived', 'amount']);

export const ACTION_STATUS_TEXT: Record<string, string> = {
  pending: 'Pendiente',
  cancelled: 'Cancelada',
  expired: 'Vencida',
  confirmed: '✅ Hecho',
  failed: 'No se aplicó',
  undone: '↩️ Deshecho',
};

export function fieldLabel(field: string) {
  return FIELD_LABELS[field] ?? field;
}

export function formatValue(field: string, value: unknown, apartmentNames: Record<string, string> = {}): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'apartmentId') return apartmentNames[String(value)] ?? String(value);
  // fmtNumber(0) devuelve '' → se muestra $0
  if (MONEY_FIELDS.has(field) && typeof value === 'number') return `$${fmtNumber(Math.round(value)) || '0'}`;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  if (field === 'observations' && typeof value === 'string') return value.split('\n').join(' · ');
  if (Array.isArray(value)) return value.length ? `${value.length} elemento(s)` : 'ninguno';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
