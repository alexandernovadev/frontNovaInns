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
