import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApartmentsService } from '../../core/services/apartments.service';
import { IApartment } from '../../core/interfaces';
import { ModalNova } from '../../shared/components/modal-nova';
import { StatusBadge } from '../../shared/components/status-badge';
import { Pagination } from '../../shared/components/pagination';
import { AlertService } from '../../shared/components/services/alert.service';
import { LucideAngularModule, Building2 } from 'lucide-angular';
import { loadList } from '../../shared/utils/list.util';
import { DeleteState, openDelete, confirmDelete } from '../../shared/utils/delete.util';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo',
  MAINTENANCE: 'Mantenimiento',
  INACTIVE: 'Inactivo',
};
const STATUS_CLASS: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success',
  MAINTENANCE: 'bg-warning/10 text-warning',
  INACTIVE: 'bg-error/10 text-error',
};

@Component({
  selector: 'app-apartments',
  imports: [FormsModule, LucideAngularModule, ModalNova, StatusBadge, Pagination],
  templateUrl: './apartments.html',
})
export class ApartmentsComponent implements OnInit {
  readonly Building2 = Building2;

  private apartmentsService = inject(ApartmentsService);
  private router = inject(Router);
  private alert = inject(AlertService);

  apartments = signal<IApartment[]>([]);
  meta = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });
  loading = signal(false);
  search = '';
  statusFilter = '';

  showCreate = signal(false);
  saving = signal(false);
  deleteState: DeleteState<IApartment> = {
    selected: signal<IApartment | null>(null),
    show: signal(false),
    saving: signal(false),
  };
  newName = '';

  statusLabel = STATUS_LABEL;
  statusClass = STATUS_CLASS;
  statuses = Object.keys(STATUS_LABEL);

  ngOnInit() {
    this.load();
  }

  load(page = 1) {
    loadList(
      this.loading,
      this.apartments,
      this.meta,
      this.apartmentsService.findAll({ search: this.search, status: this.statusFilter, page }),
    );
  }

  openDetail(apartment: IApartment) {
    this.router.navigate(['/apartments', apartment._id]);
  }

  openCreate() {
    this.newName = '';
    this.showCreate.set(true);
  }

  submitCreate() {
    if (!this.newName.trim()) return;
    this.saving.set(true);
    this.apartmentsService.create({ internalName: this.newName.trim() }).subscribe({
      next: (apartment) => {
        this.showCreate.set(false);
        this.saving.set(false);
        this.router.navigate(['/apartments', apartment._id]);
      },
      error: () => this.saving.set(false),
    });
  }

  openDelete(apartment: IApartment, e: Event) {
    e.stopPropagation();
    openDelete(this.deleteState, apartment);
  }

  onDeleteClosed() {
    this.deleteState.show.set(false);
  }

  confirmDelete() {
    confirmDelete(
      this.deleteState,
      (id) => this.apartmentsService.remove(id),
      this.alert,
      () => {
        this.load(1);
      },
      { success: 'Apartamento eliminado', error: 'Error al eliminar apartamento' },
    );
  }
}
