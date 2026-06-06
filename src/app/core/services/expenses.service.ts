import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../../shared/constants/api.constant';
import { buildParams } from '../../shared/utils/http-params.util';
import { IExpense, ExpensePage, ExpenseQuery } from '../interfaces';

const BASE = `${API}/expenses`;

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private http = inject(HttpClient);

  findAll(query: ExpenseQuery = {}) {
    return this.http.get<ExpensePage>(BASE, { params: buildParams(query) });
  }

  findById(id: string) {
    return this.http.get<IExpense>(`${BASE}/${id}`);
  }

  create(data: any) {
    return this.http.post<IExpense>(BASE, data);
  }

  update(id: string, data: any) {
    return this.http.patch<IExpense>(`${BASE}/${id}`, data);
  }

  remove(id: string) {
    return this.http.delete(`${BASE}/${id}`);
  }
}
