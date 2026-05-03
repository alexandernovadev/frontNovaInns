import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { UploadService } from '../../shared/services/upload.service';

const API = 'http://localhost:3000/api';

export interface IGuest {
  fullName:  string;
  idNumber?: string;
  birthDate?: string;
  location?: {
    countryCode: string;
    countryName: string;
    department: string;
    city: string;
  };
  identifications?: { url: string; publicId: string; type: string; uploadedAt: string }[];
}

export interface IExtraService {
  _id?: string;
  type: 'CAR' | 'MOTORCYCLE' | 'OTHER';
  description: string;
  quantity: number;
  price: number;
}

export interface IBilling {
  basePrice: number;
  extraServices: IExtraService[];
  totalAmount: number;
  amountReceived: number;
  platform: 'Booking' | 'AirBnB' | 'Directo';
  paymentMethod: 'Efectivo' | 'Nequi' | 'Bancolombia' | 'None';
  status: 'PAGADO' | 'FALTA PAGO' | 'NO SHOW';
}

export interface IBooking {
  _id: string;
  apartmentId: { _id: string; internalName: string; status: string } | string;
  group: { host: IGuest; members: IGuest[] };
  stay: { checkIn: string; checkOut: string };
  billing: IBilling;
  observations: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingPage {
  data: IBooking[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface FinancialSummary {
  totalExpected: number;
  totalReceived: number;
  totalPending: number;
}

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private http = inject(HttpClient);

  findAll(query: { search?: string; status?: string; platform?: string; page?: number } = {}) {
    let params = new HttpParams();
    if (query.search)   params = params.set('search',   query.search);
    if (query.status)   params = params.set('status',   query.status);
    if (query.platform) params = params.set('platform', query.platform);
    if (query.page)     params = params.set('page',     query.page);
    return this.http.get<BookingPage>(`${API}/bookings`, { params });
  }

  findById(id: string) {
    return this.http.get<IBooking>(`${API}/bookings/${id}`);
  }

  create(data: any) {
    return this.http.post<IBooking>(`${API}/bookings`, data);
  }

  update(id: string, data: any) {
    return this.http.patch<IBooking>(`${API}/bookings/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<void>(`${API}/bookings/${id}`);
  }

  registerPayment(id: string, amount: number) {
    return this.http.patch<IBooking>(`${API}/bookings/${id}/payment`, { amount });
  }

  financialSummary() {
    return this.http.get<FinancialSummary>(`${API}/bookings/summary/financial`);
  }

  uploadImage(file: File) {
    return inject(UploadService).upload(file, 'bookings');
  }

  deleteImage(publicId: string) {
    return inject(UploadService).delete(publicId);
  }

  aptName(booking: IBooking): string {
    const a = booking.apartmentId;
    return typeof a === 'string' ? a : a.internalName;
  }

  nights(booking: IBooking): number {
    const ms = new Date(booking.stay.checkOut).getTime() - new Date(booking.stay.checkIn).getTime();
    return Math.round(ms / 86400000);
  }

  pending(booking: IBooking | null): number {
    return booking ? booking.billing.totalAmount - booking.billing.amountReceived : 0;
  }
}
