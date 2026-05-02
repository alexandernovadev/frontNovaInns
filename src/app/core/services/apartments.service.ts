import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

const API = 'http://localhost:3000/api';

export interface IPhoto { url: string; publicId: string; caption: string; uploadedAt: string; }
export interface IRoom {
  _id?: string; name: string;
  furniture:  { beds: number; closets: number; nightstands: number };
  windows:    { curtains: number; sheers: number };
  inventory:  { hangers: number; pillows: number };
}
export interface IBathroom {
  _id?: string; name: string;
  fixtures: { toilets: number; sinks: number; electricShowers: number };
}
export interface IApartment {
  _id: string; internalName: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  rooms: IRoom[]; bathrooms: IBathroom[];
  equipment: any; parking: { totalSpots: number };
  photos: IPhoto[]; createdAt: string;
}
export interface ApartmentPage {
  data: IApartment[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class ApartmentsService {
  private http = inject(HttpClient);

  findAll(query: { search?: string; status?: string; page?: number } = {}) {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status);
    if (query.page)   params = params.set('page',   query.page);
    return this.http.get<ApartmentPage>(`${API}/apartments`, { params });
  }

  findById(id: string) {
    return this.http.get<IApartment>(`${API}/apartments/${id}`);
  }

  create(data: any) {
    return this.http.post<IApartment>(`${API}/apartments`, data);
  }

  update(id: string, data: any) {
    return this.http.patch<IApartment>(`${API}/apartments/${id}`, data);
  }

  remove(id: string) {
    return this.http.delete(`${API}/apartments/${id}`);
  }

  // Fotos
  addPhoto(id: string, photo: { url: string; publicId: string; caption?: string }) {
    return this.http.post<IApartment>(`${API}/apartments/${id}/photos`, photo);
  }

  removePhoto(id: string, publicId: string) {
    return this.http.delete<IApartment>(`${API}/apartments/${id}/photos`, { body: { publicId } });
  }

  // Upload imagen a Cloudinary via backend
  uploadImage(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string; publicId: string }>(`${API}/upload/apartments`, form);
  }
}
