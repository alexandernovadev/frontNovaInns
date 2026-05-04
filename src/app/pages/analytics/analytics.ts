import { Component, inject, signal, OnInit, OnDestroy, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts';
import { AnalyticsService, DashboardData } from '../../core/services/analytics.service';
import { CurrencyCopPipe } from '../../shared/pipes/currency-cop.pipe';
import { LucideAngularModule, BarChart3, TrendingUp, PieChart, Globe, Building2, CalendarDays, Hash, DollarSign, ArrowLeft, ChevronRight } from 'lucide-angular';

@Component({
  selector: 'app-analytics',
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
  readonly ChevronRight = ChevronRight;

  private svc = inject(AnalyticsService);
  private http = inject(HttpClient);

  data = signal<DashboardData | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  mapReady = signal(false);

  tab = signal<'dashboard' | 'map'>('dashboard');

  // drill-down state
  viewLevel = signal<'world' | 'country'>('world');
  selectedCountry = signal<{ code: string; name: string } | null>(null);
  departmentData = signal<{ department: string; guests: number; revenue: number }[] | null>(null);
  cityData = signal<{ department: string; city: string; guests: number; revenue: number }[] | null>(null);
  selectedDept = signal<string | null>(null);
  deptGeoReady = signal(false);

  monthlyOptions: any = {};
  platformOptions: any = {};
  paymentOptions: any = {};
  occupancyOptions: any = {};
  dayOfWeekOptions: any = {};
  extraServicesOptions: any = {};
  topAptOptions: any = {};
  mapOptions: any = {};

  private deptNameMap: Record<string, Record<string, string>> = {
    CO: { 'Bogotá': 'Bogota' },
    EC: { 'Bolívar': 'Bolivar', 'Los Ríos': 'Los Rios', 'Manabí': 'Manabi', 'Sucumbíos': 'Sucumbios' },
  };

  private normalizeDeptName(name: string, countryCode?: string): string {
    if (countryCode && this.deptNameMap[countryCode]?.[name]) return this.deptNameMap[countryCode][name];
    return name;
  }
  private mapRegistered = false;
  private loadedDeptCountries: Set<string> = new Set();

  ngOnInit() {
    this.loadGeoJson();
    this.loadData();
  }

  ngOnDestroy() {
    this.selectedCountry.set(null);
  }

  private loadGeoJson() {
    this.http.get('/assets/geo/world.json', { responseType: 'json' }).subscribe({
      next: geo => {
        echarts.registerMap('world', geo as any);
        this.mapRegistered = true;
        this.mapReady.set(true);
        if (this.data()) this.buildWorldMapOptions();
      },
      error: () => this.mapReady.set(false),
    });
  }

  private loadDeptGeo(countryCode: string) {
    const countryMap: Record<string, string> = { CO: 'colombia', EC: 'ecuador', PE: 'peru', MX: 'mexico' };
    const file = countryMap[countryCode];
    if (!file || this.loadedDeptCountries.has(countryCode)) return;
    this.http.get(`/assets/geo/${file}_departments.json`, { responseType: 'json' }).subscribe({
      next: geo => {
        echarts.registerMap('country_dept', geo as any);
        this.loadedDeptCountries.add(countryCode);
        this.deptGeoReady.set(true);
        this.buildDeptMapOptions();
      },
    });
  }

  loadData() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.dashboard().subscribe({
      next: d => {
        this.data.set(d);
        this.buildCharts(d);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar datos');
        this.loading.set(false);
      },
    });
  }

  private buildCharts(d: DashboardData) {
    this.buildMonthlyOptions(d);
    this.buildPlatformOptions(d);
    this.buildPaymentOptions(d);
    this.buildOccupancyOptions(d);
    this.buildDayOfWeekOptions(d);
    this.buildExtraServicesOptions(d);
    this.buildTopAptOptions(d);
    if (this.mapRegistered) this.buildWorldMapOptions(d);
  }

  private buildMonthlyOptions(d: DashboardData) {
    const months = d.monthly.map(m => m.month.slice(-2) + '/' + m.month.slice(2, 4));
    this.monthlyOptions = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['Esperado', 'Recibido'], textStyle: { color: '#B3B3B8' } },
      grid: { left: 60, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: months, axisLabel: { color: '#6E6E73' }, axisLine: { lineStyle: { color: '#2A2A2E' } } },
      yAxis: { type: 'value', axisLabel: { color: '#6E6E73', formatter: (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: '#2A2A2E' } } },
      series: [
        { name: 'Esperado', type: 'bar', data: d.monthly.map(m => m.expected), itemStyle: { color: '#F2C200', borderRadius: [4, 4, 0, 0] } },
        { name: 'Recibido', type: 'bar', data: d.monthly.map(m => m.received), itemStyle: { color: '#22C55E', borderRadius: [4, 4, 0, 0] } },
      ],
    };
  }

  private buildPlatformOptions(d: DashboardData) {
    this.platformOptions = {
      tooltip: { trigger: 'item', formatter: '{b}: ${c}' },
      series: [{
        type: 'pie', radius: ['45%', '70%'], center: ['50%', '50%'],
        label: { color: '#B3B3B8', fontSize: 11 },
        data: d.platforms.map(p => ({ value: p.total, name: p.platform })),
        itemStyle: { borderRadius: 4 },
        color: ['#F2C200', '#3B82F6', '#22C55E'],
      }],
    };
  }

  private buildPaymentOptions(d: DashboardData) {
    this.paymentOptions = {
      tooltip: { trigger: 'item', formatter: '{b}: ${c}' },
      series: [{
        type: 'pie', radius: ['45%', '70%'], center: ['50%', '50%'],
        label: { color: '#B3B3B8', fontSize: 11 },
        data: d.payments.map(p => ({ value: p.total, name: p.method })),
        itemStyle: { borderRadius: 4 },
        color: ['#22C55E', '#FACC15', '#3B82F6', '#6E6E73'],
      }],
    };
  }

  private buildOccupancyOptions(d: DashboardData) {
    const months = d.occupancy.map(m => m.month.slice(-2) + '/' + m.month.slice(2, 4));
    this.occupancyOptions = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['% Ocupación', 'Ingresos'], textStyle: { color: '#B3B3B8' } },
      grid: { left: 60, right: 60, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: months, axisLabel: { color: '#6E6E73' }, axisLine: { lineStyle: { color: '#2A2A2E' } } },
      yAxis: [
        { type: 'value', name: '%', nameTextStyle: { color: '#6E6E73' }, axisLabel: { color: '#6E6E73' }, splitLine: { lineStyle: { color: '#2A2A2E' } }, max: 100 },
        { type: 'value', name: 'Ingresos', nameTextStyle: { color: '#6E6E73' }, axisLabel: { color: '#6E6E73', formatter: (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k` }, splitLine: { show: false } },
      ],
      series: [
        { name: '% Ocupación', type: 'line', data: d.occupancy.map(m => m.occupancyPct), yAxisIndex: 0, lineStyle: { color: '#F2C200' }, itemStyle: { color: '#F2C200' }, areaStyle: { color: 'rgba(242,194,0,0.1)' }, smooth: true },
        { name: 'Ingresos', type: 'bar', data: d.occupancy.map(m => m.revenue), yAxisIndex: 1, itemStyle: { color: '#3B82F6', borderRadius: [4, 4, 0, 0] } },
      ],
    };
  }

  private buildDayOfWeekOptions(d: DashboardData) {
    this.dayOfWeekOptions = {
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: d.dayOfWeek.map(dw => dw.day), axisLabel: { color: '#6E6E73' }, axisLine: { lineStyle: { color: '#2A2A2E' } } },
      yAxis: { type: 'value', axisLabel: { color: '#6E6E73' }, splitLine: { lineStyle: { color: '#2A2A2E' } } },
      series: [{ type: 'bar', data: d.dayOfWeek.map(dw => dw.count), itemStyle: { color: '#F2C200', borderRadius: [4, 4, 0, 0] } }],
    };
  }

  private buildExtraServicesOptions(d: DashboardData) {
    const labels: Record<string, string> = { CAR: 'Auto', MOTORCYCLE: 'Moto', OTHER: 'Otro' };
    this.extraServicesOptions = {
      tooltip: { trigger: 'item', formatter: '{b}: ${c}' },
      series: [{
        type: 'pie', radius: ['45%', '70%'], center: ['50%', '50%'],
        label: { color: '#B3B3B8', fontSize: 11 },
        data: d.extraServices.map(s => ({ value: s.total, name: labels[s.type] || s.type })),
        itemStyle: { borderRadius: 4 },
        color: ['#3B82F6', '#F59E0B', '#8B5CF6'],
      }],
    };
  }

  private buildTopAptOptions(d: DashboardData) {
    this.topAptOptions = {
      tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].name}<br/>${p[0].marker} $${p[0].value.toLocaleString('es-CO')}` },
      grid: { left: 120, right: 30, top: 10, bottom: 20 },
      xAxis: { type: 'value', axisLabel: { color: '#6E6E73', formatter: (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: '#2A2A2E' } } },
      yAxis: { type: 'category', data: d.topApartments.map(a => a.name).reverse(), axisLabel: { color: '#B3B3B8', fontSize: 11 }, axisLine: { lineStyle: { color: '#2A2A2E' } } },
      series: [{ type: 'bar', data: d.topApartments.map(a => a.total).reverse(), itemStyle: { color: '#F2C200', borderRadius: [0, 4, 4, 0] } }],
    };
  }

  // ── World map ──
  private buildWorldMapOptions(d?: DashboardData) {
    const data = d ?? this.data();
    if (!data) return;
    this.mapOptions = {
      tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}<br/>Huéspedes: ${p.value ?? 0}<br/>Ingresos: $${(data.countries.find(c => c.name === p.name)?.revenue ?? 0).toLocaleString('es-CO')}` },
      visualMap: { min: 0, max: Math.max(...data.countries.map(c => c.guests), 1), left: 'left', top: 'bottom', text: ['Alto', 'Bajo'], textStyle: { color: '#6E6E73' }, inRange: { color: ['rgba(242,194,0,0.1)', 'rgba(242,194,0,0.4)', '#F2C200'] } },
      series: [{
        type: 'map', map: 'world', nameProperty: 'ADMIN', roam: true,
        label: { show: false },
        emphasis: { label: { show: true, color: '#fff' }, itemStyle: { areaColor: '#F2C200' } },
        itemStyle: { areaColor: '#151518', borderColor: '#2A2A2E' },
        data: data.countries.map(c => ({ name: c.name, value: c.guests })),
      }],
    };
  }

  // ── Departmental map ──
  private buildDeptMapOptions() {
    const deptList = this.departmentData();
    const countryCode = this.selectedCountry()?.code;
    if (!deptList || !countryCode) return;
    const max = Math.max(...deptList.map(d => d.guests), 1);
    this.mapOptions = {
      tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}<br/>Huéspedes: ${p.value ?? 0}<br/>Ingresos: $${(deptList.find(d => this.normalizeDeptName(d.department, countryCode) === p.name)?.revenue ?? 0).toLocaleString('es-CO')}` },
      visualMap: { min: 0, max, left: 'left', top: 'bottom', text: ['Alto', 'Bajo'], textStyle: { color: '#6E6E73' }, inRange: { color: ['rgba(59,130,246,0.1)', 'rgba(59,130,246,0.4)', '#3B82F6'] } },
      series: [{
        type: 'map', map: 'country_dept', nameProperty: 'name', roam: true,
        label: { show: true, color: '#B3B3B8', fontSize: 9 },
        emphasis: { label: { show: true, color: '#fff', fontSize: 12 }, itemStyle: { areaColor: '#3B82F6' } },
        itemStyle: { areaColor: '#151518', borderColor: '#2A2A2E' },
        data: deptList.map(d => ({ name: this.normalizeDeptName(d.department, countryCode), value: d.guests })),
      }],
    };
  }

  // ── Click handlers ──
  onMapClick(e: any) {
    const country = this.data()?.countries.find(c => c.name === e.name);
    if (!country) return;
    this.selectedCountry.set({ code: country.code, name: country.name });
    this.viewLevel.set('country');
    this.departmentData.set(null);
    this.cityData.set(null);
    this.selectedDept.set(null);

    this.loadDeptGeo(country.code);
    this.svc.regions(country.code, 'department').subscribe({
      next: r => {
        this.departmentData.set(r);
        this.buildDeptMapOptions();
      },
    });
  }

  onDeptClick(e: any) {
    const deptName = e.name;
    const countryCode = this.selectedCountry()?.code;
    if (!countryCode || !deptName) return;
    this.selectedDept.set(deptName);
    this.svc.regions(countryCode).subscribe({
      next: r => this.cityData.set(r.filter(c => this.normalizeDeptName(c.department, countryCode) === deptName)),
    });
  }

  goBackToWorld() {
    this.viewLevel.set('world');
    this.selectedCountry.set(null);
    this.departmentData.set(null);
    this.cityData.set(null);
    this.selectedDept.set(null);
    if (this.data()) this.buildWorldMapOptions();
  }

  closeDeptDetail() {
    this.selectedDept.set(null);
    this.cityData.set(null);
  }

  pct(v: number) {
    const d = this.data();
    if (!d || !d.summary.totalExpected) return 0;
    return Math.round((v / d.summary.totalExpected) * 100);
  }

  @HostListener('window:resize')
  onResize() {}
}
