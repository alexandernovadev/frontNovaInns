import { Component, inject, signal, OnInit, OnDestroy, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts';
import * as L from 'leaflet';
import { AnalyticsService } from '../../core/services/analytics.service';
import { DashboardData, VacancyData } from '../../core/interfaces';
import { CurrencyCopPipe } from '../../shared/pipes/currency-cop.pipe';
import {
  LucideAngularModule,
  BarChart3,
  TrendingUp,
  PieChart,
  Globe,
  Building2,
  CalendarDays,
  Hash,
  DollarSign,
  ArrowLeft,
} from 'lucide-angular';

@Component({
  selector: 'app-analytics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxEchartsDirective, LucideAngularModule, CurrencyCopPipe],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './analytics.html',
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  readonly BarChart3 = BarChart3;
  readonly TrendingUp = TrendingUp;
  readonly PieChart = PieChart;
  readonly Globe = Globe;
  readonly Building2 = Building2;
  readonly CalendarDays = CalendarDays;
  readonly Hash = Hash;
  readonly DollarSign = DollarSign;
  readonly ArrowLeft = ArrowLeft;

  private analytics = inject(AnalyticsService);
  private http = inject(HttpClient);

  data = signal<DashboardData | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  tab = signal<'dashboard' | 'map'>('dashboard');

  // drill-down state
  departmentData = signal<{ department: string; guests: number; revenue: number }[] | null>(null);
  cityData = signal<{ department: string; city: string; guests: number; revenue: number }[] | null>(
    null,
  );
  selectedDept = signal<string | null>(null);
  selectedDeptInfo = signal<{ guests: number; revenue: number } | null>(null);
  selectedMapCountry = signal('CO');
  leafletReady = signal(false);

  availableCountries = [
    { code: 'CO', name: 'Colombia' },
    { code: 'EC', name: 'Ecuador' },
  ];

  // vacancy
  vacancy = signal<VacancyData | null>(null);
  vacancyLoading = signal(false);

  // ECharts options (dashboard)
  monthlyOptions: any = {};
  platformOptions: any = {};
  paymentOptions: any = {};
  dayOfWeekOptions: any = {};

  // Leaflet map
  private map: L.Map | null = null;
  private geoLayer: L.GeoJSON | null = null;
  private mapInitialized = false;

  private deptNameMap: Record<string, Record<string, string>> = {
    CO: { Bogotá: 'Bogota' },
    EC: { Bolívar: 'Bolivar', 'Los Ríos': 'Los Rios', Manabí: 'Manabi', Sucumbíos: 'Sucumbios' },
  };

  private normalizeDeptName(name: string, countryCode?: string): string {
    if (countryCode && this.deptNameMap[countryCode]?.[name])
      return this.deptNameMap[countryCode][name];
    return name;
  }

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroyMap();
  }

  // ── Data loading ──
  loadData() {
    this.loading.set(true);
    this.error.set(null);
    this.vacancyLoading.set(true);
    this.analytics.dashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.buildCharts(d);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar datos');
        this.loading.set(false);
      },
    });
    this.analytics.vacancy().subscribe({
      next: (v) => {
        this.vacancy.set(v);
        this.vacancyLoading.set(false);
      },
      error: () => this.vacancyLoading.set(false),
    });
  }

  // ── Tab switch ──
  onTabChange(t: 'dashboard' | 'map') {
    this.tab.set(t);
    if (t === 'map') {
      setTimeout(() => this.initMap(), 100);
    }
  }

  // ── Leaflet map ──
  private initMap() {
    if (this.mapInitialized) return;
    const el = document.getElementById('leaflet-map');
    if (!el) {
      setTimeout(() => this.initMap(), 300);
      return;
    }

    try {
      this.map = L.map(el, {
        center: [4.5, -74],
        zoom: 7,
        zoomControl: true,
        attributionControl: false,
      });

      const tileLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 19,
        },
      );
      tileLayer.addTo(this.map);

      tileLayer.on('tileerror', () => {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(this.map!);
      });

      setTimeout(() => this.map?.invalidateSize(), 300);
      this.mapInitialized = true;
      this.leafletReady.set(true);
      this.loadDeptLayer(this.selectedMapCountry());
    } catch {
      setTimeout(() => this.initMap(), 500);
    }
  }

  private destroyMap() {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.mapInitialized = false;
      this.leafletReady.set(false);
    }
  }

  switchCountry(code: string) {
    this.selectedMapCountry.set(code);
    this.selectedDept.set(null);
    this.cityData.set(null);
    this.departmentData.set(null);
    this.loadDeptLayer(code);
  }

  private loadDeptLayer(countryCode: string) {
    const fileMap: Record<string, string> = {
      CO: 'colombia',
      EC: 'ecuador',
      PE: 'peru',
      MX: 'mexico',
    };
    const file = fileMap[countryCode];
    if (!file || !this.map) return;

    // Load both GeoJSON and department data, then draw
    this.http.get(`/assets/geo/${file}_departments.json`, { responseType: 'json' }).subscribe({
      next: (geo: any) => {
        this.analytics.regions(countryCode, 'department').subscribe((r) => {
          this.departmentData.set(r);
          this.drawDeptLayer(geo, countryCode);
        });
      },
    });
  }

  private drawDeptLayer(geo: any, countryCode: string) {
    if (!this.map) return;
    if (this.geoLayer) {
      this.map.removeLayer(this.geoLayer);
      this.geoLayer = null;
    }

    const deptList = this.departmentData();
    const maxGuests = Math.max(...(deptList?.map((d) => d.guests) ?? [1]), 1);

    this.geoLayer = L.geoJSON(geo, {
      style: (feature: any) => {
        const name = feature?.properties?.name ?? '';
        const dept = deptList?.find(
          (d) => this.normalizeDeptName(d.department, countryCode) === name,
        );
        const guests = dept?.guests ?? 0;
        const intensity = maxGuests > 0 ? guests / maxGuests : 0;
        if (guests > 0) {
          return {
            color: 'rgba(242,194,0,0.6)',
            weight: 2,
            fillColor: `rgba(242,194,0,${0.15 + intensity * 0.6})`,
            fillOpacity: 0.85,
          };
        }
        return {
          color: 'rgba(255,255,255,0.08)',
          weight: 1,
          fillColor: 'rgba(255,255,255,0.02)',
          fillOpacity: 0.5,
        };
      },
      onEachFeature: (feature: any, layer: L.Layer) => {
        const name = feature?.properties?.name ?? '';
        const dept = deptList?.find(
          (d) => this.normalizeDeptName(d.department, countryCode) === name,
        );
        const guests = dept?.guests ?? 0;
        const revenue = dept?.revenue ?? 0;

        if (guests > 0) {
          layer.bindTooltip(`<strong>${guests}</strong>`, {
            permanent: true,
            direction: 'center',
            className: 'leaflet-label-guestcount',
          });
        }

        layer.on({
          click: () => {
            this.onDeptClick(name, countryCode);
          },
          mouseover: (e: any) => {
            const target = e.target;
            target.setStyle({
              weight: 3,
              color: guests > 0 ? '#F2C200' : 'rgba(255,255,255,0.3)',
              fillOpacity: guests > 0 ? 0.95 : 0.3,
            });
            target.bringToFront();
          },
          mouseout: (e: any) => {
            this.geoLayer?.resetStyle(e.target);
          },
        });
      },
    }).addTo(this.map);

    this.map.fitBounds((this.geoLayer as any).getBounds(), { padding: [30, 30], maxZoom: 7 });
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  // ── Drill-down ──
  onDeptClick(deptName: string, countryCode: string) {
    this.selectedDept.set(deptName);
    const dept = this.departmentData()?.find(
      (d) => this.normalizeDeptName(d.department, countryCode) === deptName,
    );
    this.selectedDeptInfo.set(dept ? { guests: dept.guests, revenue: dept.revenue } : null);
    this.cityData.set(null);
    this.analytics.regions(countryCode).subscribe({
      next: (r) =>
        this.cityData.set(
          r.filter((c) => this.normalizeDeptName(c.department, countryCode) === deptName),
        ),
      error: () => this.cityData.set([]),
    });
  }

  closeDeptDetail() {
    this.selectedDept.set(null);
    this.selectedDeptInfo.set(null);
    this.cityData.set(null);
  }

  // ── Chart builders (same as before) ──
  private buildCharts(d: DashboardData) {
    this.buildMonthlyOptions(d);
    this.buildPlatformOptions(d);
    this.buildPaymentOptions(d);
    this.buildDayOfWeekOptions(d);
  }

  // (intentionally empty — vacancy chart removed)

  // (intentionally blank — vacancy chart removed)

  private buildMonthlyOptions(d: DashboardData) {
    const months = d.monthly.map((m) => m.month.slice(-2) + '/' + m.month.slice(2, 4));
    this.monthlyOptions = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['Pendiente', 'Recibido'], textStyle: { color: '#B3B3B8' } },
      grid: { left: 60, right: 20, top: 40, bottom: 30 },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: { color: '#6E6E73' },
        axisLine: { lineStyle: { color: '#2A2A2E' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#6E6E73',
          formatter: (v: number) =>
            v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`,
        },
        splitLine: { lineStyle: { color: '#2A2A2E' } },
      },
      series: [
        {
          name: 'Pendiente',
          type: 'bar',
          data: d.monthly.map((m) => m.pending),
          itemStyle: { color: '#F2C200', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: 'Recibido',
          type: 'bar',
          data: d.monthly.map((m) => m.received),
          itemStyle: { color: '#22C55E', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }

  private buildPlatformOptions(d: DashboardData) {
    this.platformOptions = {
      tooltip: { trigger: 'item', formatter: '{b}: ${c}' },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '50%'],
          label: { color: '#B3B3B8', fontSize: 11 },
          data: d.platforms.map((p) => ({ value: p.total, name: p.platform })),
          itemStyle: { borderRadius: 4 },
          color: ['#F2C200', '#3B82F6', '#22C55E'],
        },
      ],
    };
  }

  private buildPaymentOptions(d: DashboardData) {
    this.paymentOptions = {
      tooltip: { trigger: 'item', formatter: '{b}: ${c}' },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '50%'],
          label: { color: '#B3B3B8', fontSize: 11 },
          data: d.payments.map((p) => ({ value: p.total, name: p.method })),
          itemStyle: { borderRadius: 4 },
          color: ['#22C55E', '#FACC15', '#3B82F6', '#6E6E73'],
        },
      ],
    };
  }

  // (intentionally blank — occupancy chart removed)

  // (intentionally blank — extra services chart removed)

  // (intentionally blank — top apartments chart removed)

  private buildDayOfWeekOptions(d: DashboardData) {
    this.dayOfWeekOptions = {
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: 'category',
        data: d.dayOfWeek.map((dw) => dw.day),
        axisLabel: { color: '#6E6E73' },
        axisLine: { lineStyle: { color: '#2A2A2E' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#6E6E73' },
        splitLine: { lineStyle: { color: '#2A2A2E' } },
      },
      series: [
        {
          type: 'bar',
          data: d.dayOfWeek.map((dw) => dw.count),
          itemStyle: { color: '#F2C200', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }



  pct(v: number) {
    const d = this.data();
    if (!d || !d.summary.totalExpected) return 0;
    return Math.round((v / d.summary.totalExpected) * 100);
  }

  @HostListener('window:resize')
  onResize() {
    this.map?.invalidateSize();
  }
}
