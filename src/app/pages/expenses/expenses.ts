import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ExpensesService } from '../../core/services/expenses.service';
import { IExpense, ExpenseQuery } from '../../core/interfaces';
import { ModalNova } from '../../shared/components/modal-nova';
import { Pagination } from '../../shared/components/pagination';
import { AlertService } from '../../shared/components/services/alert.service';
import { AutocompleteSelect } from '../../shared/components/autocomplete-select';
import { LucideAngularModule, Receipt } from 'lucide-angular';
import { METHODS } from '../../shared/constants/booking.constants';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_CLASS } from '../../shared/constants/expense.constants';
import { loadList } from '../../shared/utils/list.util';
import { DeleteState, openDelete, confirmDelete } from '../../shared/utils/delete.util';

@Component({
  selector: 'app-expenses',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CurrencyPipe, DatePipe, LucideAngularModule, ModalNova, Pagination, AutocompleteSelect],
  templateUrl: './expenses.html',
})
export class ExpensesComponent implements OnInit {
  readonly ReceiptIcon = Receipt;

  private expensesService = inject(ExpensesService);
  private alert = inject(AlertService);

  expenses = signal<IExpense[]>([]);
  meta = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });
  loading = signal(false);
  search = '';
  categoryFilter = '';
  saving = signal(false);

  deleteState: DeleteState<IExpense> = {
    selected: signal<IExpense | null>(null),
    show: signal(false),
    saving: signal(false),
  };

  showForm = signal(false);
  editing = signal<IExpense | null>(null);
  form = { description: '', amount: 0, category: '', date: '', paymentMethod: '', notes: '' };

  categories = EXPENSE_CATEGORIES;
  categoryLabels = EXPENSE_CATEGORY_LABELS;
  categoryClass = EXPENSE_CATEGORY_CLASS;
  methods = METHODS;

  ngOnInit() { this.load(); }

  load(page = 1) {
    const q: ExpenseQuery = { page, limit: 20, search: this.search || undefined, category: this.categoryFilter || undefined };
    loadList(this.loading, this.expenses, this.meta, this.expensesService.findAll(q));
  }

  onSearch() { this.load(1); }

  openCreate() {
    this.editing.set(null);
    this.form = { description: '', amount: 0, category: '', date: new Date().toISOString().slice(0, 10), paymentMethod: '', notes: '' };
    this.showForm.set(true);
  }

  openEdit(expense: IExpense) {
    this.editing.set(expense);
    this.form = {
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date.slice(0, 10),
      paymentMethod: expense.paymentMethod,
      notes: expense.notes ?? '',
    };
    this.showForm.set(true);
  }

  submitForm() {
    this.saving.set(true);
    const obs = this.editing()
      ? this.expensesService.update(this.editing()!._id, this.form)
      : this.expensesService.create(this.form);

    obs.subscribe({
      next: () => {
        this.showForm.set(false);
        this.load(1);
        this.saving.set(false);
        this.alert.success(this.editing() ? 'Gasto actualizado' : 'Gasto creado');
      },
      error: () => {
        this.saving.set(false);
        this.alert.error('Error al guardar el gasto');
      },
    });
  }

  openDelete(expense: IExpense) { openDelete(this.deleteState, expense); }
  onDeleteClosed() { this.deleteState.show.set(false); }
  confirmDelete() {
    confirmDelete(this.deleteState, id => this.expensesService.remove(id), this.alert, () => {
      this.load(1);
    }, { success: 'Gasto eliminado', error: 'Error al eliminar gasto' });
  }
}
