import { WritableSignal } from '@angular/core';
import { Observable } from 'rxjs';
import { AlertService } from '../components/services/alert.service';

export interface DeleteState<T> {
  selected: WritableSignal<T | null>;
  show: WritableSignal<boolean>;
  saving: WritableSignal<boolean>;
}

export function openDelete<T extends { _id?: string }>(
  state: DeleteState<T>,
  item: T,
  event?: Event,
) {
  event?.stopPropagation();
  state.selected.set(item);
  state.show.set(true);
}

export function confirmDelete<T extends { _id?: string }>(
  state: DeleteState<T>,
  deleteFn: (id: string) => Observable<any>,
  alert: AlertService,
  onSuccess: () => void,
  messages?: { success?: string; error?: string },
) {
  const id = state.selected()?._id;
  if (!id) return;
  state.saving.set(true);
  deleteFn(id).subscribe({
    next: () => {
      state.show.set(false);
      state.saving.set(false);
      onSuccess();
      alert.success(messages?.success ?? 'Eliminado correctamente');
    },
    error: () => {
      state.saving.set(false);
      alert.error(messages?.error ?? 'Error al eliminar');
    },
  });
}
