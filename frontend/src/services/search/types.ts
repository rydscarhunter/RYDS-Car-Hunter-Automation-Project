// Define common types for our search service
// Vehicle interface moved to vehicleApi.ts

export interface SearchParams {
  make?: string;
  model?: string;
  color?: string;
  vatQualifying?: boolean;
  minYear?: string;
  maxYear?: string;
  minMileage?: string;
  maxMileage?: string;
  minPrice?: string;
  maxPrice?: string;
}

export interface WebsiteCredentials {
  id: string; // Required by Supabase schema
  name: string;
  url: string;
  username: string;
  password: string;
  notes?: string;
  active: boolean;
  user_id?: string; // Optional in the type since it's added server-side
}

import { Vehicle } from "../api/vehicleApi";

export interface SearchResult {
  vehicles: Vehicle[];
  source: string;
  error?: string;
}
