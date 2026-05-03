export const PLATFORMS = ['Booking', 'AirBnB', 'Directo'] as const;

export const PLATFORM_CLASS: Record<string, string> = {
  Booking: 'bg-blue-500/15 text-blue-400 border-2 border-blue-500/40',
  AirBnB: 'bg-rose-500/15 text-rose-400 border-2 border-rose-500/40',
  Directo: 'bg-brand/15 text-brand border-2 border-brand/40',
};

export const METHODS = ['Efectivo', 'Nequi', 'Bancolombia', 'None'] as const;

export const STATUSES = ['PAGADO', 'FALTA PAGO', 'NO SHOW'] as const;

export const ID_TYPES = ['FRONT', 'BACK', 'SELFIE'] as const;

export const ID_LABELS: Record<string, string> = {
  FRONT: 'Frontal',
  BACK: 'Trasera',
  SELFIE: 'Selfie',
};
