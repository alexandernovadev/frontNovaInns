import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-angular';
import { BookingsService } from '../../core/services/bookings.service';
import type { IBooking } from '../../core/interfaces';
import { isHoliday } from '../../shared/constants/holidays.constant';
import { CurrencyCopPipe } from '../../shared/pipes/currency-cop.pipe';

interface DayInfo {
  dateStr: string;
  day: number;
  bookings: IBooking[];
  holiday: string | null;
  isToday: boolean;
  isPadding: boolean;
}

interface PopoverData {
  x: number;
  y: number;
  dayStr: string;
  bookings: IBooking[];
}

@Component({
  standalone: true,
  imports: [NgClass, LucideAngularModule, CurrencyCopPipe],
  selector: 'app-calendar',
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class CalendarComponent implements OnInit {
  readonly CalendarDays = CalendarDays;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;

  private bookingsService = inject(BookingsService);

  year = signal(new Date().getFullYear());
  rawBookings = signal<IBooking[]>([]);
  loading = signal(true);

  popover = signal<PopoverData | null>(null);

  monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  dayHeaders = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  months = computed(() => {
    const y = this.year();
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const bkMap = new Map<string, IBooking[]>();
    for (const b of this.rawBookings()) {
      const d = b.stay.checkIn.slice(0, 10);
      if (!bkMap.has(d)) bkMap.set(d, []);
      bkMap.get(d)!.push(b);
    }

    const result: { month: number; name: string; days: DayInfo[] }[] = [];
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const firstDay = (new Date(y, m, 1).getDay() + 6) % 7;
      const days: DayInfo[] = [];
      for (let p = 0; p < firstDay; p++) {
        days.push({ dateStr: '', day: 0, bookings: [], holiday: null, isToday: false, isPadding: true });
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(Date.UTC(y, m, d));
        const dateStr = date.toISOString().slice(0, 10);
        days.push({
          dateStr,
          day: d,
          bookings: bkMap.get(dateStr) || [],
          holiday: isHoliday(dateStr),
          isToday: dateStr === todayStr,
          isPadding: false,
        });
      }
      result.push({ month: m, name: this.monthNames[m], days });
    }
    return result;
  });

  prevYear() { this.year.update(y => y - 1); this.loadYear(); }
  nextYear() { this.year.update(y => y + 1); this.loadYear(); }

  onDayClick(e: MouseEvent, day: DayInfo) {
    e.stopPropagation();
    if (day.isPadding || !day.bookings.length) {
      this.popover.set(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.popover.set({
      x: rect.left,
      y: rect.bottom + 4,
      dayStr: day.dateStr,
      bookings: day.bookings,
    });
  }

  closePopover() { this.popover.set(null); }

  nights(b: IBooking) {
    return Math.round((new Date(b.stay.checkOut).getTime() - new Date(b.stay.checkIn).getTime()) / 86400000);
  }

  aptName(b: IBooking) {
    const a = b.apartmentId as any;
    return a?.internalName || a?.name || '—';
  }

  @HostListener('document:click')
  onDocClick() { this.popover.set(null); }

  @HostListener('window:scroll')
  onScroll() { this.popover.set(null); }

  ngOnInit() { this.loadYear(); }

  private loadYear() {
    this.loading.set(true);
    this.popover.set(null);
    const y = this.year();
    this.bookingsService.findAll({
      fromDate: `${y}-01-01`,
      toDate: `${y}-12-31`,
      page: 1,
    }).subscribe({
      next: (res: any) => {
        this.rawBookings.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
