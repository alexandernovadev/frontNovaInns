import { WritableSignal } from '@angular/core';
import { Observable } from 'rxjs';

interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export function loadList<T>(
  loading: WritableSignal<boolean>,
  dataSignal: WritableSignal<T[]>,
  metaSignal: WritableSignal<PageMeta>,
  observable: Observable<Page<T>>,
) {
  loading.set(true);
  observable.subscribe({
    next: (res) => {
      dataSignal.set(res.data);
      metaSignal.set(res.meta);
      loading.set(false);
    },
    error: () => loading.set(false),
  });
}
