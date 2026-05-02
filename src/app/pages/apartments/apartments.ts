import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApartmentsService, IApartment } from '../../core/services/apartments.service';

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
  imports: [FormsModule],
  templateUrl: './apartments.html',
})
export class ApartmentsComponent implements OnInit {
  private svc = inject(ApartmentsService);
  private router = inject(Router);

  apartments = signal<IApartment[]>([]);
  meta = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });
  loading = signal(false);
  search = '';
  statusFilter = '';

  showCreate = signal(false);
  showDelete = signal(false);
  selected = signal<IApartment | null>(null);
  saving = signal(false);
  newName = '';

  statusLabel = STATUS_LABEL;
  statusClass = STATUS_CLASS;
  statuses = Object.keys(STATUS_LABEL);

  ngOnInit() {
    this.load();
  }

  load(page = 1) {
    this.loading.set(true);
    this.svc.findAll({ search: this.search, status: this.statusFilter, page }).subscribe({
      next: (res) => {
        this.apartments.set(res.data);
        this.meta.set(res.meta);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openDetail(apt: IApartment) {
    this.router.navigate(['/apartments', apt._id]);
  }

  openCreate() {
    this.newName = '';
    this.showCreate.set(true);
  }

  submitCreate() {
    if (!this.newName.trim()) return;
    this.saving.set(true);
    this.svc.create({ internalName: this.newName.trim() }).subscribe({
      next: (apt) => {
        this.showCreate.set(false);
        this.saving.set(false);
        this.router.navigate(['/apartments', apt._id]);
      },
      error: () => this.saving.set(false),
    });
  }

  openDelete(apt: IApartment, e: Event) {
    e.stopPropagation();
    this.selected.set(apt);
    this.showDelete.set(true);
  }

  confirmDelete() {
    const id = this.selected()?._id;
    if (!id) return;
    this.saving.set(true);
    this.svc.remove(id).subscribe({
      next: () => {
        this.showDelete.set(false);
        this.saving.set(false);
        this.load(1);
      },
      error: () => this.saving.set(false),
    });
  }

  pages() {
    return Array.from({ length: this.meta().totalPages }, (_, i) => i + 1);
  }
}
