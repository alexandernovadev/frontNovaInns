import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../../shared/constants/api.constant';
import { buildParams } from '../../shared/utils/http-params.util';
import { DashboardData, RegionData, VacancyData } from '../interfaces';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);

  dashboard(from?: string, to?: string, apartmentId?: string) {
    return this.http.get<DashboardData>(`${API}/analytics/dashboard`, { params: buildParams({ from, to, apartmentId }) });
  }

  regions(country: string, groupBy?: string, from?: string, to?: string, apartmentId?: string) {
    return this.http.get<RegionData[]>(`${API}/analytics/regions`, { params: buildParams({ country, groupBy, from, to, apartmentId }) });
  }

  vacancy(from?: string, to?: string, apartmentId?: string) {
    return this.http.get<VacancyData>(`${API}/analytics/vacancy`, { params: buildParams({ from, to, apartmentId }) });
  }
}
