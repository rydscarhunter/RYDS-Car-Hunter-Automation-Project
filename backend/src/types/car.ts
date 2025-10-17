export interface CarData {
  url: string;
  imageUrl: string;
  title: string;
  price: number;
  location: string;
  registration: string;
  make?: string;
  model?: string;
  year?: number;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  colour?: string;
  listType?: string; // Type of listing (e.g., "auction", "buy it now", etc.)
}

export interface StandardizedCarData extends CarData {
  source: string; // The name of the site where this car was found
  timestamp: string; // When this data was scraped
}
