import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../../shared/constants/api.constant';
import { buildParams } from '../../shared/utils/http-params.util';
import { IUser, UserPage, UserQuery } from '../interfaces';

const BASE = `${API}/users`;

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
