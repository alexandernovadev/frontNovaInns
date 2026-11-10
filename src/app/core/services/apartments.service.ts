import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap, catchError, throwError } from 'rxjs';
import { UploadService } from '../../shared/services/upload.service';
import { API } from '../../shared/constants/api.constant';
import { buildParams } from '../../shared/utils/http-params.util';
import { IApartment, ApartmentPage } from '../interfaces';

@Injectable({ providedIn: 'root' })
export class ApartmentsService {
  private http = inject(HttpClient);

  findAll(query: { search?: string; status?: string; page?: number; limit?: number } = {}) {
    return this.http.get<ApartmentPage>(`${API}/apartments`, { params: buildParams(query) });
  }

  // El mismo listado de apartamentos se pide en 5 vistas (filtros, selectores,
  // admin). Se comparte con una caché corta: cambia solo cuando se edita aquí.
  private static readonly LIST_TTL_MS = 60_000;
  private listCache = new Map<string, Observable<ApartmentPage>>();
  private listCacheAt = new Map<string, number>();

  findAllCached(
    query: { search?: string; status?: string; page?: number; limit?: number } = {},
  ): Observable<ApartmentPage> {
    const key = JSON.stringify(query);
    const cached = this.listCache.get(key);
    if (cached && Date.now() - (this.listCacheAt.get(key) ?? 0) < ApartmentsService.LIST_TTL_MS)
      return cached;

    const req = this.http
      .get<ApartmentPage>(`${API}/apartments`, { params: buildParams(query) })
      .pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
        // un fallo no debe quedar replayeado para siempre
        catchError((err) => {
          this.listCache.delete(key);
          return throwError(() => err);
        }),
      );
    this.listCache.set(key, req);
    this.listCacheAt.set(key, Date.now());
    return req;
  }

  clearListCache(): void {
    this.listCache.clear();
    this.listCacheAt.clear();
  }

  findById(id: string) {
    return this.http.get<IApartment>(`${API}/apartments/${id}`);
  }

  create(data: any) {
    return this.http.post<IApartment>(`${API}/apartments`, data).pipe(tap(() => this.clearListCache()));
  }

  update(id: string, data: any) {
    return this.http
      .patch<IApartment>(`${API}/apartments/${id}`, data)
      .pipe(tap(() => this.clearListCache()));
  }

  remove(id: string) {
    return this.http.delete(`${API}/apartments/${id}`).pipe(tap(() => this.clearListCache()));
  }

  // Fotos
  addPhoto(id: string, photo: { url: string; publicId: string; caption?: string }) {
    return this.http
      .post<IApartment>(`${API}/apartments/${id}/photos`, photo)
      .pipe(tap(() => this.clearListCache()));
  }

  removePhoto(id: string, publicId: string) {
    return this.http
      .delete<IApartment>(`${API}/apartments/${id}/photos`, { body: { publicId } })
      .pipe(tap(() => this.clearListCache()));
  }

  // Upload imagen a Cloudinary via backend
  uploadImage(file: File) {
    return inject(UploadService).upload(file, 'apartments');
  }
}
