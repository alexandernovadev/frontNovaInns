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

export const EXPENSE_CATEGORY_CLASS: Record<string, string> = {
  SUPPLIES: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
  MAINTENANCE: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  CLEANING: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  SERVICES: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  TAXES: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
  SALARY: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  MARKETING: 'bg-pink-500/15 text-pink-400 border border-pink-500/30',
  UTILITIES: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  OTHER: 'bg-neutral-500/15 text-neutral-400 border border-neutral-500/30',
};
