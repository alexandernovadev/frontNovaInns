export interface IUser {
  _id: string;
  auth:        { email: string; role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'GUEST' };
  profile:     { fullName: string; phone: string; identificationNumber?: string };
  workContext: { isActive: boolean };
  preferences: { language: string };
}

export interface UserPage {
  data: IUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface UserQuery {
  search?: string;
  role?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}
