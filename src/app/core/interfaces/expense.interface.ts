export interface IExpense {
  _id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paymentMethod: string;
  apartmentId?: { _id: string; internalName: string } | string | null;
  notes?: string;
  receipt?: { url: string; publicId: string } | null;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory = 'SUPPLIES' | 'MAINTENANCE' | 'CLEANING' | 'SERVICES' | 'TAXES' | 'SALARY' | 'MARKETING' | 'UTILITIES' | 'OTHER';

export interface ExpensePage {
  data: IExpense[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ExpenseQuery {
  search?: string;
  category?: string;
  fromDate?: string;
  toDate?: string;
  apartmentId?: string;
  page?: number;
  limit?: number;
}
