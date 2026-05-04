import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../../shared/constants/api.constant';

export interface DashboardData {
  summary: {
    totalExpected: number; totalReceived: number; totalPending: number;
    bookingCount: number; avgTotal: number; avgNights: number;
  };
  monthly: { month: string; expected: number; received: number; count: number }[];
  platforms: { platform: string; total: number; count: number }[];
  payments: { method: string; total: number; count: number }[];
  occupancy: { month: string; occupiedNights: number; availableNights: number; occupancyPct: number; revenue: number; count: number }[];
  dayOfWeek: { day: string; count: number; revenue: number }[];
  extraServices: { type: string; total: number; count: number }[];
  topApartments: { _id: string; name: string; total: number; received: number; count: number; nights: number }[];
  countries: { code: string; name: string; guests: number; revenue: number }[];
  recent: any[];
  inventory: { totalApts: number; activeApts: number; maintenanceApts: number; totalBeds: number; totalRooms: number; totalBathrooms: number };
}

export interface RegionData {
  department: string; city: string; guests: number; revenue: number;
}

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
