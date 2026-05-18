export interface DashboardData {
  summary: {
    totalExpected: number; totalReceived: number; totalPending: number;
    bookingCount: number; avgTotal: number; avgNights: number;
  };
  monthly: { month: string; pending: number; received: number; count: number }[];
  platforms: { platform: string; total: number; count: number }[];
  payments: { method: string; total: number; count: number }[];
  dayOfWeek: { day: string; count: number; revenue: number }[];
  countries: { code: string; name: string; guests: number; revenue: number }[];
}

export interface RegionData {
  department: string; city: string; guests: number; revenue: number;
}

export interface VacancyData {
  totalUnsoldDays: number;
  totalDaySlots: number;
  vacancyRate: number;
  avgUnsoldPerApt: number;
  avgOccupiedPerApt: number;
  totalDaysInRange: number;
  totalApts: number;
  daily: { date: string; booked: number; vacant: number }[];
  monthly: { label: string; unsoldDays: number; availableDays: number; vacancyPct: number; daysInCycle: number; avgUnsoldPerApt: number; avgOccupiedPerApt: number }[];
}
