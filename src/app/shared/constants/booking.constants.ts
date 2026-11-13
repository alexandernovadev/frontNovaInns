export const PLATFORMS = ['Booking', 'AirBnB', 'Directo'] as const;

/** Tinte pastel de cada plataforma (clases .tint-* de styles/patterns.css). */
export const PLATFORM_CLASS: Record<string, string> = {
  Booking: 'tint-sky',
  AirBnB: 'tint-rose',
  Directo: 'tint-butter',
};

// Color de acento por plataforma (franja de las tarjetas y brillo al pasar el mouse)
export const PLATFORM_ACCENT: Record<string, string> = {
  Booking: '#9bd2fa',
  AirBnB: '#f6b2b9',
  Directo: '#ecdc92',
};

export const METHODS = ['Efectivo', 'Nequi', 'Bancolombia', 'None'] as const;

export const STATUSES = ['PAGADO', 'FALTA PAGO'] as const;

export const LIFECYCLE_STATUSES = ['PENDIENTE', 'CHECK-IN', 'CHECK-OUT'] as const;

export const LIFECYCLE_CLASS: Record<string, string> = {
  'PENDIENTE': 'tint-sky',
  'CHECK-IN': 'tint-mint',
  'CHECK-OUT': 'tint-lilac',
};

export const ID_TYPES = ['FRONT', 'BACK', 'SELFIE'] as const;

export const ID_LABELS: Record<string, string> = {
  FRONT: 'Frontal',
  BACK: 'Trasera',
  SELFIE: 'Selfie',
};
