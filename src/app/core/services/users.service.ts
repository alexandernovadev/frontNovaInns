import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../../shared/constants/api.constant';
import { buildParams } from '../../shared/utils/http-params.util';

const BASE = `${API}/users`;

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

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);

  findAll(query: UserQuery = {}) {
    return this.http.get<UserPage>(BASE, { params: buildParams(query) });
  }

  create(data: any) {
    return this.http.post<IUser>(BASE, data);
  }

  update(id: string, data: any) {
    return this.http.patch<IUser>(`${BASE}/${id}`, data);
  }

  remove(id: string) {
    return this.http.delete(`${BASE}/${id}`);
  }
}
