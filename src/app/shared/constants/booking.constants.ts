export const PLATFORMS = ['Booking', 'AirBnB', 'Directo'] as const;

export const PLATFORM_CLASS: Record<string, string> = {
  Booking: 'bg-blue-500/15 text-blue-400 border-2 border-blue-500/40',
  AirBnB: 'bg-rose-500/15 text-rose-400 border-2 border-rose-500/40',
  Directo: 'bg-brand/15 text-brand border-2 border-brand/40',
};

export const METHODS = ['Efectivo', 'Nequi', 'Bancolombia', 'None'] as const;

export const STATUSES = ['PAGADO', 'FALTA PAGO', 'NO SHOW'] as const;

export const LIFECYCLE_STATUSES = ['PENDIENTE', 'CHECK-IN', 'CHECK-OUT'] as const;

export const LIFECYCLE_CLASS: Record<string, string> = {
  'PENDIENTE': 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  'CHECK-IN': 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  'CHECK-OUT': 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
};

export const ID_TYPES = ['FRONT', 'BACK', 'SELFIE'] as const;

export const ID_LABELS: Record<string, string> = {
  FRONT: 'Frontal',
  BACK: 'Trasera',
  SELFIE: 'Selfie',
};
