import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DataService, ClearableModel } from '../../core/services/data.service';
import { ModalNova } from '../../shared/components/modal-nova';
import { AlertService } from '../../shared/components/services/alert.service';
import { LucideAngularModule, Shield, CalendarDays, Building2, Receipt } from 'lucide-angular';

interface AdminModel {
  key: ClearableModel;
  label: string;
  description: string;
  icon: typeof CalendarDays;
}

@Component({
  selector: 'app-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, ModalNova],
  templateUrl: './admin.html',
})
export class AdminComponent implements OnInit {
  readonly ShieldIcon = Shield;

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
}