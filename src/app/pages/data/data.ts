import { Component, inject, signal } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import { LucideAngularModule, ArrowUpDown } from 'lucide-angular';

type Model = 'bookings' | 'apartments';

interface ImportResult { inserted: number; updated: number; }
interface ImportState  { loading: boolean; result: ImportResult | null; error: string | null; }

@Component({
  selector: 'app-data',
  imports: [LucideAngularModule],
  templateUrl: './data.html',
})
export class DataComponent {
  readonly ArrowUpDown = ArrowUpDown;

  private svc = inject(DataService);

  exportLoading = signal<Record<Model, boolean>>({ bookings: false, apartments: false });

  importState = signal<Record<Model, ImportState>>({
    bookings:   { loading: false, result: null, error: null },
    apartments: { loading: false, result: null, error: null },
  });

  // ── EXPORT ──────────────────────────────────────────────
  export(model: Model) {
    this.exportLoading.update(s => ({ ...s, [model]: true }));

    const req$ = model === 'bookings'
      ? this.svc.exportBookings()
      : this.svc.exportApartments();

    req$.subscribe({
      next: data => {
        this.downloadJSON(data, `nova-inns-${model}-${this.today()}.json`);
        this.exportLoading.update(s => ({ ...s, [model]: false }));
      },
      error: () => this.exportLoading.update(s => ({ ...s, [model]: false })),
    });
  }

  // ── IMPORT ──────────────────────────────────────────────
  onFileChange(event: Event, model: Model) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.importState.update(s => ({ ...s, [model]: { loading: true, result: null, error: null } }));

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const records = JSON.parse(reader.result as string);
        if (!Array.isArray(records)) throw new Error('El archivo debe ser un array JSON');

        const req$ = model === 'bookings'
          ? this.svc.importBookings(records)
          : this.svc.importApartments(records);

        req$.subscribe({
          next: result => {
            this.importState.update(s => ({ ...s, [model]: { loading: false, result, error: null } }));
          },
          error: err => {
            const msg = err?.error?.message ?? 'Error al importar';
            this.importState.update(s => ({ ...s, [model]: { loading: false, result: null, error: msg } }));
          },
        });
      } catch (e: any) {
        this.importState.update(s => ({ ...s, [model]: { loading: false, result: null, error: e.message } }));
      }
    };
    reader.readAsText(file);
    (event.target as HTMLInputElement).value = '';
  }

  // ── Helpers ─────────────────────────────────────────────
  private downloadJSON(data: any, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }

  getExportLoading(model: Model) { return this.exportLoading()[model]; }
  getImport(model: Model)        { return this.importState()[model]; }
}
