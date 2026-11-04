export const EXPENSE_CATEGORIES = ['SUPPLIES', 'MAINTENANCE', 'CLEANING', 'SERVICES', 'TAXES', 'SALARY', 'MARKETING', 'UTILITIES', 'OTHER'] as const;

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  SUPPLIES: 'Insumos',
  MAINTENANCE: 'Mantenimiento',
  CLEANING: 'Limpieza',
  SERVICES: 'Servicios',
  TAXES: 'Impuestos',
  SALARY: 'Nómina',
  MARKETING: 'Marketing',
  UTILITIES: 'Servicios Públicos',
  OTHER: 'Otro',
};

/** Tinte pastel de cada categoría (clases .tint-* de styles/patterns.css). */
export const EXPENSE_CATEGORY_CLASS: Record<string, string> = {
  SUPPLIES: 'tint-sky',
  MAINTENANCE: 'tint-peach',
  CLEANING: 'tint-mint',
  SERVICES: 'tint-lilac',
  TAXES: 'tint-rose',
  SALARY: 'tint-butter',
  MARKETING: 'tint-rose',
  UTILITIES: 'tint-peach',
  OTHER: 'tint-neutral',
};
