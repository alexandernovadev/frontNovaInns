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
