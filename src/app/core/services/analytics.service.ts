import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../../shared/constants/api.constant';
import { DashboardData, RegionData } from '../interfaces';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);

  dashboard(from?: string, to?: string) {
    let params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return this.http.get<DashboardData>(`${API}/analytics/dashboard`, { params });
  }

  regions(country: string, groupBy?: string) {
    let params: any = { country };
    if (groupBy) params.groupBy = groupBy;
    return this.http.get<RegionData[]>(`${API}/analytics/regions`, { params });
  }
}
