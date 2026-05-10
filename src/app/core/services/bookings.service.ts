import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UploadService } from '../../shared/services/upload.service';
import { API } from '../../shared/constants/api.constant';
import { buildParams } from '../../shared/utils/http-params.util';
import { IBooking, BookingPage, FinancialSummary } from '../interfaces';

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private http = inject(HttpClient);
  private uploadService = inject(UploadService);

  findAll(query: { search?: string; status?: string; platform?: string; page?: number } = {}) {
    return this.http.get<BookingPage>(`${API}/bookings`, { params: buildParams(query) });
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
    return this.uploadService.upload(file, 'bookings');
  }

  deleteImage(publicId: string) {
    return this.uploadService.delete(publicId);
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

  paidPct(booking: IBooking): number {
    if (!booking.billing.totalAmount) return 0;
    return Math.min(100, Math.round((booking.billing.amountReceived / booking.billing.totalAmount) * 100));
  }

  totalGuests(booking: IBooking): number {
    return 1 + booking.group.members.length;
  }
}
