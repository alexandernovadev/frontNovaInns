export type TrackerPlatform = 'Airbnb' | 'Booking';
export type TrackerStatus = 'pending' | 'approved' | 'rejected';

export interface TrackerCompetitor {
  _id: string;
  name: string;
  platform: TrackerPlatform;
  url: string;
  externalId?: string;
  lat?: number;
  lng?: number;
  bedrooms: number;
  guests: number;
  status: TrackerStatus;
  source?: string;
  notes?: string;
  rejectReason?: string;
  distanceKm?: number;
  lastQuoteAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrackerConfig {
  mode: 'demo' | 'live';
  center: { name: string; lat: number; lng: number; radiusKm: number };
  aiEnabled: boolean;
}

export interface TrackerNightRate {
  date: string;
  price: number | null;
  available: boolean;
  minStay?: number;
}

export interface TrackerResult {
  competitorId?: string;
  competitorName: string;
  platform: string;
  url: string;
  synthetic?: boolean;
  status: 'ok' | 'blocked' | 'error';
  nights: TrackerNightRate[];
  avgNightly: number | null;
  available: boolean;
  minStay?: number;
  error?: string;
  source: string;
}

export interface TrackerNight {
  date: string;
  availableCount: number;
  prices: Record<string, number | null>;
  median: number | null;
  p25: number | null;
  p75: number | null;
  min: number | null;
  max: number | null;
}

export interface TrackerStats {
  competitorCount: number;
  availableCompetitors: number;
  failedCompetitors: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
  min: number | null;
  max: number | null;
  nights: TrackerNight[];
}

export interface TrackerRecommendation {
  action: string;
  reason: string;
  confidence: 'alta' | 'media' | 'baja';
}

export interface TrackerAnalysis {
  summary: string;
  findings: string[];
  recommendations: TrackerRecommendation[];
  ai: boolean;
  model?: string;
}

export interface TrackerQuote {
  id: string;
  mode: string;
  input: { checkIn: string; checkOut: string; guests: number; nights: number };
  results: TrackerResult[];
  stats: TrackerStats;
  ourReference: { avgNightly: number | null; sampleSize: number; source: string };
  analysis: TrackerAnalysis;
  durationMs: number;
  generatedAt: string;
}

export interface CreateCompetitorPayload {
  name: string;
  platform: TrackerPlatform;
  url: string;
  externalId?: string;
  lat?: number;
  lng?: number;
  bedrooms?: number;
  guests?: number;
  notes?: string;
  status?: TrackerStatus;
}
