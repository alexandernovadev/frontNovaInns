import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

const API = 'http://localhost:3000/api/users';

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
    let params = new HttpParams();
    if (query.search)   params = params.set('search',   query.search);
    if (query.role)     params = params.set('role',     query.role);
    if (query.isActive) params = params.set('isActive', query.isActive);
    if (query.page)     params = params.set('page',     query.page);
    if (query.limit)    params = params.set('limit',    query.limit);
    return this.http.get<UserPage>(API, { params });
  }

  create(data: any) {
    return this.http.post<IUser>(API, data);
  }

  update(id: string, data: any) {
    return this.http.patch<IUser>(`${API}/${id}`, data);
  }

  remove(id: string) {
    return this.http.delete(`${API}/${id}`);
  }
}
