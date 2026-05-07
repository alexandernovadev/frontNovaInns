import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersService, IUser, UserQuery } from '../../core/services/users.service';
import { ModalNova } from '../../shared/components/modal-nova';
import { Pagination } from '../../shared/components/pagination';
import { AlertService } from '../../shared/components/services/alert.service';
import { LucideAngularModule, Users } from 'lucide-angular';
import { ROLES, ROLE_LABELS } from '../../shared/constants/user.constants';
import { loadList } from '../../shared/utils/list.util';
import { DeleteState, openDelete, confirmDelete } from '../../shared/utils/delete.util';

@Component({
  selector: 'app-users',
  imports: [FormsModule, LucideAngularModule, ModalNova, Pagination],
  templateUrl: './users.html',
})
export class UsersComponent implements OnInit {
  readonly UsersIcon = Users;

  private usersService   = inject(UsersService);
  private alert = inject(AlertService);

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
  editSelected = signal<IUser | null>(null);
  deleteState: DeleteState<IUser> = {
    selected: signal<IUser | null>(null),
    show: signal(false),
    saving: signal(false),
  };
  saving     = signal(false);
  errorMsg   = signal('');

  // form
  form = { fullName: '', email: '', password: '', phone: '', role: 'STAFF', identificationNumber: '' };

  roles = ROLES;
  roleLabels = ROLE_LABELS;

  ngOnInit() { this.load(); }

  load(page = 1) {
    const q: UserQuery = { page, limit: 10, search: this.search || undefined, role: this.roleFilter || undefined, isActive: this.activeFilter || undefined };
    loadList(this.loading, this.users, this.meta, this.usersService.findAll(q));
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
    this.usersService.create(this.form).subscribe({
      next: () => { this.showCreate.set(false); this.load(1); this.saving.set(false); this.alert.success('Usuario creado'); },
      error: (e) => { this.errorMsg.set(e.error?.message ?? 'Error al crear'); this.saving.set(false); this.alert.error('Error al crear usuario'); },
    });
  }

  // --- Edit ---
  openEdit(user: IUser) {
    this.editSelected.set(user);
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
    const id = this.editSelected()?._id;
    if (!id) return;
    this.saving.set(true);
    const payload: any = {
      fullName: this.form.fullName,
      phone: this.form.phone,
      role: this.form.role,
      identificationNumber: this.form.identificationNumber,
    };
    this.usersService.update(id, payload).subscribe({
      next: () => { this.showEdit.set(false); this.load(this.meta().page); this.saving.set(false); this.alert.success('Usuario actualizado'); },
      error: (e) => { this.errorMsg.set(e.error?.message ?? 'Error al actualizar'); this.saving.set(false); this.alert.error('Error al actualizar usuario'); },
    });
  }

  // --- Delete ---
  openDelete(user: IUser) { openDelete(this.deleteState, user); }

  onDeleteClosed() { this.deleteState.show.set(false); }

  confirmDelete() {
    confirmDelete(this.deleteState, id => this.usersService.remove(id), this.alert, () => {
      this.load(1);
    }, { success: 'Usuario eliminado', error: 'Error al eliminar usuario' });
  }

}
