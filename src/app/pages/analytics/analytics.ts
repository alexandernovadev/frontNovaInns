import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
// alias: PieChart también es un icono de lucide en esta vista
import { BarChart as EChartsBar, PieChart as EChartsPie } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
// Leaflet solo hace falta en la pestaña Mapa: se trae con import dinámico
import type * as L from 'leaflet';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ApartmentsService } from '../../core/services/apartments.service';
import { DashboardData, VacancyData } from '../../core/interfaces';
import { CurrencyCopPipe } from '../../shared/pipes/currency-cop.pipe';
import { AutocompleteSelect } from '../../shared/components/autocomplete-select';
import { fmtNumber } from '../../shared/utils/number.util';

// Solo lo que usan las gráficas de esta vista (barra y pastel): así el chunk
// deja de arrastrar ECharts completo
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
echarts.use([
  EChartsBar,
  EChartsPie,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);
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
  styleUrl: './analytics.css',
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
  private apartmentsService = inject(ApartmentsService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  data = signal<DashboardData | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  tab = signal<'dashboard' | 'map'>('dashboard');

  yearFilter = signal(String(new Date().getFullYear()));
  monthFilter = signal('');

  apartmentFilter = signal('');
  apartmentOptions = signal<{ label: string; value: string }[]>([{ label: 'Todos', value: '' }]);

  private loadApartments() {
    this.apartmentsService.findAll().subscribe({
      next: res => this.apartmentOptions.set([
        { label: 'Todos', value: '' },
        ...res.data.map(a => ({ label: a.internalName, value: a._id })),
      ]),
    });
  }

  yearOptions = computed(() => {
    const y = new Date().getFullYear();
    const opts: { label: string; value: string }[] = [{ label: 'Todos', value: '' }];
    for (let i = 2026; i <= y + 1; i++) {
      opts.push({ label: String(i), value: String(i) });
    }
    return opts;
  });

  monthOptions = computed(() => {
    const ms = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
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
  apartmentsOptions: any = {};

  // Leaflet map
  private map: L.Map | null = null;
  // módulo de leaflet una vez cargado (ver loadLeaflet)
  private l: typeof import('leaflet') | null = null;
  private mapRetries = 0;
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
    if (p['apt']) this.apartmentFilter.set(p['apt']);
    this.loadApartments();
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
    this.analytics.dashboard(fromDate, toDate, this.apartmentFilter()).subscribe({
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
    this.analytics.vacancy(fromDate, toDate, this.apartmentFilter()).subscribe({
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
    const fromDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const next = new Date(y, m + 1, 1);
    const toDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
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
        apt: this.apartmentFilter() || undefined,
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
  /** El mapa es una pestaña más: leaflet se descarga solo cuando se abre */
  private async loadLeaflet(): Promise<typeof import('leaflet')> {
    if (this.l) return this.l;
    const mod = (await import('leaflet')) as unknown as {
      default?: typeof import('leaflet');
      map?: unknown;
    };
    // Leaflet es CommonJS: en el build de producción la API viene en `default`
    return (this.l = (mod.default ?? mod) as unknown as typeof import('leaflet'));
  }

  private async initMap() {
    if (this.mapInitialized) return;
    const L = await this.loadLeaflet();
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
    } catch (err) {
      // antes reintentaba al infinito en silencio: se avisa y se frena
      console.warn('No se pudo montar el mapa:', (err as Error)?.message ?? err);
      if (++this.mapRetries < 5) setTimeout(() => this.initMap(), 500);
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
        this.analytics.regions(countryCode, 'department', fromDate, toDate, this.apartmentFilter()).subscribe((r) => {
          this.departmentData.set(r);
          this.drawDeptLayer(geo, countryCode);
        });
      },
    });
  }

  private deptColors = [
    '#ecdc92','#91debc','#9bd2fa','#cbbdf9','#f9bb92','#f6b2b9',
    '#af9b3e','#3ca17b','#4e94c3','#8e7cc2','#bf7946','#bd6f79',
    '#f3e7b0','#b8ead3','#c3e3fb','#ddd3fb','#fbd2b6','#f9cdd2',
  ];

  private async drawDeptLayer(geo: any, countryCode: string) {
    const L = await this.loadLeaflet();
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
          const c = colorMap.get(dept!.department) || '#ecdc92';
          return {
            color: c,
            weight: 2,
            fillColor: c,
            fillOpacity: 0.7,
          };
        }
        return {
          color: 'rgba(255,255,255,0.10)',
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
              color: guests > 0 ? '#ecdc92' : 'rgba(255,255,255,0.3)',
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
    this.analytics.regions(countryCode, undefined, fromDate, toDate, this.apartmentFilter()).subscribe({
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
    this.buildApartmentsOptions(d);
  }

  // (intentionally empty — vacancy chart removed)

  // (intentionally blank — vacancy chart removed)

  // Estilo Nova para todos los gráficos: tooltip oscuro y barras con degradé
  private readonly TOOLTIP = {
    backgroundColor: '#29292e',
    borderColor: '#4a4a51',
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: '#f7f7f9', fontSize: 12, fontFamily: 'Lexend Variable, Lexend, sans-serif' },
    extraCssText: 'border-radius:14px;border-width:2px;box-shadow:0 2px 0 #3e3e44;',
  };
  private readonly AXIS_TOOLTIP = {
    ...this.TOOLTIP,
    trigger: 'axis',
    axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(236,220,146,0.08)' } },
  };
  private grad(top: string, bottom: string) {
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: top },
      { offset: 1, color: bottom },
    ]);
  }
  private readonly PIE_ITEM = { borderRadius: 6, borderColor: '#29292e', borderWidth: 3 };

  private buildMonthlyOptions(d: DashboardData) {
    const months = d.monthly.map((m) => m.month);
    this.monthlyOptions = {
      tooltip: { ...this.AXIS_TOOLTIP, valueFormatter: (v: number) => `$${fmtNumber(Math.round(v)) || '0'}` },
      // Leyenda arriba: abajo chocaba con las etiquetas del eje
      legend: { data: ['Pendiente', 'Recibido'], top: 0, right: 0, textStyle: { color: '#d4d4da' } },
      grid: { left: 60, right: 20, top: 40, bottom: months.length > 6 ? 50 : 30 },
      xAxis: {
        type: 'category',
        data: months,
        axisLabel: { color: '#b0b0b9', rotate: months.length > 6 ? 30 : 0, fontSize: 11 },
        axisLine: { lineStyle: { color: '#3e3e44' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#b0b0b9',
          formatter: (v: number) =>
            v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`,
        },
        splitLine: { lineStyle: { color: '#3e3e44' } },
      },
      series: [
        {
          name: 'Pendiente',
          type: 'bar',
          barMaxWidth: 56,
          data: d.monthly.map((m) => m.pending),
          itemStyle: { color: this.grad('#ecdc92', 'rgba(236,220,146,0.35)'), borderRadius: [6, 6, 0, 0] },
        },
        {
          name: 'Recibido',
          type: 'bar',
          barMaxWidth: 56,
          data: d.monthly.map((m) => m.received),
          itemStyle: { color: this.grad('#91debc', 'rgba(145,222,188,0.35)'), borderRadius: [6, 6, 0, 0] },
        },
      ],
    };
  }

  private buildPlatformOptions(d: DashboardData) {
    this.platformOptions = {
      tooltip: { ...this.TOOLTIP, trigger: 'item', formatter: (p: any) => `${p.name}: $${fmtNumber(p.value)} (${p.percent}%)` },
      series: [
        {
          type: 'pie',
          radius: ['38%', '60%'],
          center: ['50%', '46%'],
          label: { color: '#d4d4da', fontSize: 11 },
          data: d.platforms.map((p) => ({ value: p.total, name: p.platform, itemStyle: { color: this.resolvePlatformColor(p.platform) } })),
          itemStyle: this.PIE_ITEM,
          emphasis: { scale: true, scaleSize: 6 },
        },
      ],
    };
  }

  private resolvePlatformColor(name: string): string {
    switch (name) {
      case 'AirBnB': return '#f6b2b9';
      case 'Booking': return '#9bd2fa';
      case 'Directo': return '#ecdc92';
      default: return '#b0b0b9';
    }
  }

  private buildPaymentOptions(d: DashboardData) {
    this.paymentOptions = {
      tooltip: { ...this.TOOLTIP, trigger: 'item', formatter: (p: any) => `${p.name}: $${fmtNumber(p.value)} (${p.percent}%)` },
      series: [
        {
          type: 'pie',
          radius: ['38%', '60%'],
          center: ['50%', '46%'],
          label: { color: '#d4d4da', fontSize: 11 },
          data: d.payments.map((p) => ({ value: p.total, name: p.method, itemStyle: { color: this.resolvePaymentColor(p.method) } })),
          itemStyle: this.PIE_ITEM,
          emphasis: { scale: true, scaleSize: 6 },
        },
      ],
    };
  }

  private resolvePaymentColor(name: string): string {
    switch (name) {
      case 'Bancolombia': return '#ecdc92';
      case 'Nequi': return '#cbbdf9';
      case 'Efectivo': return '#91debc';
      default: return '#b0b0b9';
    }
  }

  // (intentionally blank — occupancy chart removed)

  // (intentionally blank — extra services chart removed)

  // (intentionally blank — top apartments chart removed)

  private buildDayOfWeekOptions(d: DashboardData) {
    const colors = ['#f9bb92','#ecdc92','#91debc','#9bd2fa','#cbbdf9','#f6b2b9','#d4d4da'];
    this.dayOfWeekOptions = {
      tooltip: this.AXIS_TOOLTIP,
      grid: { left: 50, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: 'category',
        data: d.dayOfWeek.map((dw) => dw.day),
        axisLabel: { color: '#b0b0b9' },
        axisLine: { lineStyle: { color: '#3e3e44' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#b0b0b9' },
        splitLine: { lineStyle: { color: '#3e3e44' } },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 56,
          data: d.dayOfWeek.map((dw, i) => ({ value: dw.count, itemStyle: { color: this.grad(colors[i], colors[i] + '40'), borderRadius: [6, 6, 0, 0] } })),
        },
      ],
    };
  }



  // Comparativo por apartamento: recibido + pendiente apilados (mismos colores que mensual)
  private buildApartmentsOptions(d: DashboardData) {
    this.apartmentsOptions = {
      tooltip: {
        ...this.AXIS_TOOLTIP,
        valueFormatter: (v: number) => `$${fmtNumber(Math.round(v))}`,
      },
      legend: { data: ['Recibido', 'Pendiente'], top: 0, right: 0, textStyle: { color: '#d4d4da' } },
      grid: { left: 60, right: 20, top: 40, bottom: 30 },
      xAxis: {
        type: 'category',
        data: d.apartments.map((a) => a.name.replace(/^Apartamento /, '')),
        // interval 0: en móvil ECharts escondía nombres de apartamentos
        axisLabel: { color: '#b0b0b9', fontSize: 11, interval: 0 },
        axisLine: { lineStyle: { color: '#3e3e44' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#b0b0b9',
          formatter: (v: number) =>
            v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`,
        },
        splitLine: { lineStyle: { color: '#3e3e44' } },
      },
      series: [
        {
          name: 'Recibido',
          type: 'bar',
          stack: 'total',
          barMaxWidth: 80,
          data: d.apartments.map((a) => a.received),
          itemStyle: { color: this.grad('#91debc', 'rgba(145,222,188,0.45)') },
        },
        {
          name: 'Pendiente',
          type: 'bar',
          stack: 'total',
          barMaxWidth: 80,
          data: d.apartments.map((a) => a.pending),
          itemStyle: { color: this.grad('#ecdc92', 'rgba(236,220,146,0.5)'), borderRadius: [6, 6, 0, 0] },
        },
      ],
    };
  }

  occupancyOf(apartmentId: string) {
    return this.vacancy()?.byApartment.find((a) => a.apartmentId === apartmentId);
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
