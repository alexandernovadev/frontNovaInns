import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UploadService } from '../../shared/services/upload.service';
import { API } from '../../shared/constants/api.constant';
import { buildParams } from '../../shared/utils/http-params.util';
import { IApartment, ApartmentPage } from '../interfaces';

@Injectable({ providedIn: 'root' })
export class ApartmentsService {
  private http = inject(HttpClient);

  findAll(query: { search?: string; status?: string; page?: number } = {}) {
    return this.http.get<ApartmentPage>(`${API}/apartments`, { params: buildParams(query) });
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
    return inject(UploadService).upload(file, 'apartments');
  }
}
