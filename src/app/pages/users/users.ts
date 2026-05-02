import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersService, IUser, UserQuery } from '../../core/services/users.service';
import { LucideAngularModule, Users } from 'lucide-angular';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'GUEST'] as const;
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', STAFF: 'Staff', GUEST: 'Guest',
};

@Component({
  selector: 'app-users',
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './users.html',
})
export class UsersComponent implements OnInit {
  readonly UsersIcon = Users;

  private svc = inject(UsersService);

  // tabla
  users    = signal<IUser[]>([]);
  meta     = signal({ total: 0, page: 1, limit: 10, totalPages: 1 });
  loading  = signal(false);

  // filtros
  search   = '';
  roleFilter  = '';
  activeFilter = '';

  // modales
  showCreate = signal(false);
  showEdit   = signal(false);
  showDelete = signal(false);
  selected   = signal<IUser | null>(null);
  saving     = signal(false);
  errorMsg   = signal('');

  // form
  form = { fullName: '', email: '', password: '', phone: '', role: 'STAFF', identificationNumber: '' };

  roles = ROLES;
  roleLabels = ROLE_LABELS;

  ngOnInit() { this.load(); }

  load(page = 1) {
    this.loading.set(true);
    const q: UserQuery = { page, limit: 10 };
    if (this.search)      q.search   = this.search;
    if (this.roleFilter)  q.role     = this.roleFilter;
    if (this.activeFilter) q.isActive = this.activeFilter;

    this.svc.findAll(q).subscribe({
      next: res => { this.users.set(res.data); this.meta.set(res.meta); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  onSearch() { this.load(1); }

  // --- Create ---
  openCreate() {
    this.form = { fullName: '', email: '', password: '', phone: '', role: 'STAFF', identificationNumber: '' };
    this.errorMsg.set('');
    this.showCreate.set(true);
  }

  submitCreate() {
    this.saving.set(true);
    this.svc.create(this.form).subscribe({
      next: () => { this.showCreate.set(false); this.load(1); this.saving.set(false); },
      error: (e) => { this.errorMsg.set(e.error?.message ?? 'Error al crear'); this.saving.set(false); },
    });
  }

  // --- Edit ---
  openEdit(user: IUser) {
    this.selected.set(user);
    this.form = {
      fullName: user.profile.fullName,
      email: user.auth.email,
      password: '',
      phone: user.profile.phone,
      role: user.auth.role,
      identificationNumber: user.profile.identificationNumber ?? '',
    };
    this.errorMsg.set('');
    this.showEdit.set(true);
  }

  submitEdit() {
    const id = this.selected()?._id;
    if (!id) return;
    this.saving.set(true);
    const payload: any = {
      fullName: this.form.fullName,
      phone: this.form.phone,
      role: this.form.role,
      identificationNumber: this.form.identificationNumber,
    };
    this.svc.update(id, payload).subscribe({
      next: () => { this.showEdit.set(false); this.load(this.meta().page); this.saving.set(false); },
      error: (e) => { this.errorMsg.set(e.error?.message ?? 'Error al actualizar'); this.saving.set(false); },
    });
  }

  // --- Delete ---
  openDelete(user: IUser) { this.selected.set(user); this.showDelete.set(true); }

  confirmDelete() {
    const id = this.selected()?._id;
    if (!id) return;
    this.saving.set(true);
    this.svc.remove(id).subscribe({
      next: () => { this.showDelete.set(false); this.load(1); this.saving.set(false); },
      error: () => this.saving.set(false),
    });
  }

  pages() { return Array.from({ length: this.meta().totalPages }, (_, i) => i + 1); }
}
