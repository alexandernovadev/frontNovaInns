import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts';
import * as L from 'leaflet';
import { AnalyticsService } from '../../core/services/analytics.service';
import { DashboardData, VacancyData } from '../../core/interfaces';
import { CurrencyCopPipe } from '../../shared/pipes/currency-cop.pipe';
import { AutocompleteSelect } from '../../shared/components/autocomplete-select';
import { fmtNumber } from '../../shared/utils/number.util';
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
  imports: [NgxEchartsDirective, LucideAngularModule, CurrencyCopPipe, AutocompleteSelect],
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
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  data = signal<DashboardData | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  tab = signal<'dashboard' | 'map'>('dashboard');

  yearFilter = signal(String(new Date().getFullYear()));
  monthFilter = signal('');

  yearOptions = computed(() => {
    const y = new Date().getFullYear();
    const opts: { label: string; value: string }[] = [{ label: 'Todos', value: '' }];
    for (let i = 2026; i <= y + 1; i++) {
      opts.push({ label: String(i), value: String(i) });
    }
    return opts;
  });

  monthOptions = computed(() => {
    const ms = ['Enero 18 - Febrero 18','Febrero 18 - Marzo 18','Marzo 18 - Abril 18',
                'Abril 18 - Mayo 18','Mayo 18 - Junio 18','Junio 18 - Julio 18',
                'Julio 18 - Agosto 18','Agosto 18 - Septiembre 18','Septiembre 18 - Octubre 18',
                'Octubre 18 - Noviembre 18','Noviembre 18 - Diciembre 18','Diciembre 18 - Enero 18'];
    const opts: { label: string; value: string }[] = [{ label: 'Todos', value: '' }];
    for (let m = 0; m < 12; m++) {
      opts.push({ label: ms[m], value: String(m) });
    }
    return opts;
  });

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
    const p = this.route.snapshot.queryParams;
    if (p['year']) this.yearFilter.set(p['year']);
    if (p['month']) this.monthFilter.set(p['month']);
    this.loadData();
    this.syncUrl();
  }

  ngOnDestroy() {
    this.destroyMap();
  }

  // ── Data loading ──
  loadData() {
    const { fromDate, toDate } = this.dateRange();
    this.loading.set(true);
    this.error.set(null);
    this.vacancyLoading.set(true);
    this.analytics.dashboard(fromDate, toDate).subscribe({
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
    this.analytics.vacancy(fromDate, toDate).subscribe({
      next: (v) => {
        this.vacancy.set(v);
        this.vacancyLoading.set(false);
      },
      error: () => this.vacancyLoading.set(false),
    });
  }

  private dateRange(): { fromDate?: string; toDate?: string } {
    if (!this.yearFilter() || !this.monthFilter()) return {};
    const y = parseInt(this.yearFilter());
    const m = parseInt(this.monthFilter());
    const fromDate = `${y}-${String(m + 1).padStart(2, '0')}-18`;
    const toY = m === 11 ? y + 1 : y;
    const toM = m === 11 ? 1 : m + 2;
    const toDate = `${toY}-${String(toM).padStart(2, '0')}-18`;
    return { fromDate, toDate };
  }

  onFilterChange() {
    this.loadData();
    if (this.tab() === 'map' && this.mapInitialized) {
      this.loadDeptLayer(this.selectedMapCountry());
    }
    this.syncUrl();
  }

  private syncUrl() {
    this.router.navigate([], {
      queryParams: {
        year: this.yearFilter() || undefined,
        month: this.monthFilter() || undefined,
      },
      replaceUrl: true,
      queryParamsHandling: 'merge',
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
    const { fromDate, toDate } = this.dateRange();
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
        this.analytics.regions(countryCode, 'department', fromDate, toDate).subscribe((r) => {
          this.departmentData.set(r);
          this.drawDeptLayer(geo, countryCode);
        });
      },
    });
  }

  private deptColors = [
    '#EF4444','#F97316','#EAB308','#22C55E','#14B8A6','#06B6D4',
    '#3B82F6','#8B5CF6','#D946EF','#EC4899','#F43F5E','#84CC16',
    '#10B981','#0EA5E9','#6366F1','#A855F7','#F59E0B','#65A30D',
  ];

  private drawDeptLayer(geo: any, countryCode: string) {
    if (!this.map) return;
    if (this.geoLayer) {
      this.map.removeLayer(this.geoLayer);
      this.geoLayer = null;
    }

    const deptList = this.departmentData();
    const colorMap = new Map<string, string>();
    if (deptList) {
      deptList.forEach((d, i) => {
        colorMap.set(d.department, this.deptColors[i % this.deptColors.length]);
      });
    }

    this.geoLayer = L.geoJSON(geo, {
      style: (feature: any) => {
        const name = feature?.properties?.name ?? '';
        const dept = deptList?.find(
          (d) => this.normalizeDeptName(d.department, countryCode) === name,
        );
        const guests = dept?.guests ?? 0;
        if (guests > 0) {
          const c = colorMap.get(dept!.department) || '#F2C200';
          return {
            color: c,
            weight: 2,
            fillColor: c,
            fillOpacity: 0.7,
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
            if (guests > 0) {
              target.setTooltipContent(`${name} — <strong>${guests}</strong> ${guests === 1 ? 'huésped' : 'huéspedes'}`);
            }
          },
          mouseout: (e: any) => {
            this.geoLayer?.resetStyle(e.target);
            if (guests > 0) {
              e.target.setTooltipContent(`<strong>${guests}</strong>`);
            }
          },
        });
      },
    }).addTo(this.map);

    this.map.fitBounds((this.geoLayer as any).getBounds(), { padding: [30, 30], maxZoom: 7 });
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  // ── Drill-down ──
  onDeptClick(deptName: string, countryCode: string) {
    const { fromDate, toDate } = this.dateRange();
    this.selectedDept.set(deptName);
    const dept = this.departmentData()?.find(
      (d) => this.normalizeDeptName(d.department, countryCode) === deptName,
    );
    this.selectedDeptInfo.set(dept ? { guests: dept.guests, revenue: dept.revenue } : null);
    this.cityData.set(null);
    this.analytics.regions(countryCode, undefined, fromDate, toDate).subscribe({
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
    const months = d.monthly.map((m) => m.month);
    this.monthlyOptions = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['Pendiente', 'Recibido'], textStyle: { color: '#B3B3B8' } },
      grid: { left: 60, right: 20, top: 40, bottom: 60 },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: { color: '#6E6E73', rotate: 30, fontSize: 11 },
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
      tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}: $${fmtNumber(p.value)} (${p.percent}%)` },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '50%'],
          label: { color: '#B3B3B8', fontSize: 11 },
          data: d.platforms.map((p) => ({ value: p.total, name: p.platform, itemStyle: { color: this.resolvePlatformColor(p.platform) } })),
          itemStyle: { borderRadius: 4 },
        },
      ],
    };
  }

  private resolvePlatformColor(name: string): string {
    switch (name) {
      case 'AirBnB': return '#FF5A5F';
      case 'Booking': return '#023580';
      case 'Directo': return '#CA8A04';
      default: return '#6E6E73';
    }
  }

  private buildPaymentOptions(d: DashboardData) {
    this.paymentOptions = {
      tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}: $${fmtNumber(p.value)} (${p.percent}%)` },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '50%'],
          label: { color: '#B3B3B8', fontSize: 11 },
          data: d.payments.map((p) => ({ value: p.total, name: p.method, itemStyle: { color: this.resolvePaymentColor(p.method) } })),
          itemStyle: { borderRadius: 4 },
        },
      ],
    };
  }

  private resolvePaymentColor(name: string): string {
    switch (name) {
      case 'Bancolombia': return '#FACC15';
      case 'Nequi': return '#6D28D9';
      case 'Efectivo': return '#22C55E';
      default: return '#6E6E73';
    }
  }

  // (intentionally blank — occupancy chart removed)

  // (intentionally blank — extra services chart removed)

  // (intentionally blank — top apartments chart removed)

  private buildDayOfWeekOptions(d: DashboardData) {
    const colors = ['#F97316','#EAB308','#22C55E','#06B6D4','#3B82F6','#8B5CF6','#EC4899'];
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
          data: d.dayOfWeek.map((dw, i) => ({ value: dw.count, itemStyle: { color: colors[i], borderRadius: [4, 4, 0, 0] } })),
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
