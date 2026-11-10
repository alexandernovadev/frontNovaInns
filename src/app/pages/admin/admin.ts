import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DataService, ClearableModel } from '../../core/services/data.service';
import { ModalNova } from '../../shared/components/modal-nova';
import { AlertService } from '../../shared/components/services/alert.service';
import { LucideAngularModule, Trash2, CalendarDays, Building2, Receipt, Banknote } from 'lucide-angular';

interface AdminModel {
  key: ClearableModel;
  label: string;
  description: string;
  icon: typeof CalendarDays;
}

// Resultado de la herramienta temporal "Arreglar precios"
interface FixPricesResult {
  checked: number;
  fixed: number;
  changes: string[];
}

@Component({
  selector: 'app-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, ModalNova],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class AdminComponent implements OnInit {
  readonly TrashIcon = Trash2;
  readonly BanknoteIcon = Banknote;

  private dataService = inject(DataService);
  private alert = inject(AlertService);

  models: AdminModel[] = [
    { key: 'bookings', label: 'Reservas', description: 'Todas las reservas', icon: CalendarDays },
    { key: 'apartments', label: 'Apartamentos', description: 'Todos los apartamentos', icon: Building2 },
    { key: 'expenses', label: 'Gastos', description: 'Todos los gastos', icon: Receipt },
  ];

  counts = signal<Record<ClearableModel, number>>({ bookings: 0, apartments: 0, expenses: 0 });
  loadingCounts = signal(false);

  confirmTarget = signal<AdminModel | null>(null);
  saving = signal(false);

  // TEMPORAL: "Arreglar precios" (múltiplos de $100). Se quita cuando no haga falta
  showFix = signal(false);
  fixing = signal(false);
  fixResult = signal<FixPricesResult | null>(null);

  ngOnInit() { this.loadCounts(); }

  loadCounts() {
    this.loadingCounts.set(true);
    this.dataService.getCounts().subscribe({
      next: (counts) => {
        this.counts.set(counts);
        this.loadingCounts.set(false);
      },
      error: () => this.loadingCounts.set(false),
    });
  }

  openConfirm(model: AdminModel) { this.confirmTarget.set(model); }
  onConfirmClosed() { this.confirmTarget.set(null); }

  confirmClear() {
    const model = this.confirmTarget();
    if (!model) return;
    this.saving.set(true);
    this.dataService.clearModel(model.key).subscribe({
      next: (res) => {
        this.confirmTarget.set(null);
        this.saving.set(false);
        this.counts.update(c => ({ ...c, [model.key]: 0 }));
        this.alert.success(`${res.deleted} ${model.label} eliminados`);
      },
      error: () => {
        this.saving.set(false);
        this.alert.error('Error al vaciar los datos');
      },
    });
  }

  // ── Arreglar precios (temporal) ──
  openFix() { this.showFix.set(true); }

  onFixClosed() {
    this.showFix.set(false);
    this.fixResult.set(null);
  }

  confirmFix() {
    this.fixing.set(true);
    this.dataService.fixBookingPrices().subscribe({
      next: (res) => {
        this.fixing.set(false);
        this.fixResult.set(res);
        this.alert.success(
          res.fixed ? `${res.fixed} reservas con precios corregidos` : 'Todo estaba en múltiplos de $100',
        );
      },
      error: () => {
        this.fixing.set(false);
        this.alert.error('No se pudieron arreglar los precios');
      },
    });
  }
}