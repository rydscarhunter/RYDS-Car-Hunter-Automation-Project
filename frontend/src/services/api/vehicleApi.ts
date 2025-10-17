import { SearchParams, SearchResult } from "../search/types";

// Frontend Vehicle interface that matches what the API actually returns
export interface Vehicle {
  id: string;
  title: string;
  price: string | number;
  imageUrl: string;
  location: string;
  registration: string;
  source: string;
  url: string;
  timestamp: string;
  mileage?: number;
}

// Backend API types
export interface ApiSearchRequest {
  make?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  minMileage?: number;
  maxMileage?: number;
  color?: string | null;
  minAge?: number;
  maxAge?: number;
  vatQualifying?: boolean;
}

export interface ApiVehicle {
  id?: string;
  make?: string;
  model?: string;
  variant?: string;
  year?: number;
  mileage?: number;
  color?: string;
  price?: number | string;
  location?: string;
  registration?: string;
  image?: string;
  imageUrl?: string;
  source?: string;
  url?: string;
  description?: string;
  title?: string;
  name?: string;
  primaryVehicleDescription?: string;
  vrm?: string;
  capCleanPrice?: string | number;
  localSaleLocation?: string;
}

export interface ApiResponse {
  success: boolean;
  data?: ApiVehicle[];
  error?: string;
}

class VehicleApiService {
  private baseUrl: string;

  constructor() {
    // Default to localhost:3001, but can be overridden with environment variable
    // this.baseUrl =
    //   import.meta.env.VITE_API_BASE_URL ||
    //   "https://ryds-car-hunter-backend.onrender.com";
    this.baseUrl =
      import.meta.env.VITE_API_BASE_URL ||
      "https://ryds-car-hunter-backend-5qlu.onrender.com";
  }

  // Convert frontend search params to backend API format
  convertSearchParamsToApi(params: SearchParams): ApiSearchRequest {
    const currentYear = new Date().getFullYear();

    const apiRequest: ApiSearchRequest = {
      make: params.make || undefined,
      model: params.model || undefined,
      minPrice: parseInt(params.minPrice || "0"),
      maxPrice: parseInt(params.maxPrice || "1000000"),
      minMileage: parseInt(params.minMileage || "0"),
      maxMileage: parseInt(params.maxMileage || "1000000"),
      color: params.color === "any_color" ? null : params.color,
      minAge:
        params.minYear && params.minYear !== "any_min_year"
          ? Math.max(0, currentYear - parseInt(params.minYear))
          : undefined,
      maxAge:
        params.maxYear && params.maxYear !== "any_max_year"
          ? Math.max(1, currentYear - parseInt(params.maxYear))
          : undefined,
      vatQualifying: params.vatQualifying,
    };

    // Only include make and model if they are actually provided and not "any" values
    if (
      !params.make ||
      params.make.trim() === "" ||
      params.make === "any_make"
    ) {
      delete apiRequest.make;
    }
    if (
      !params.model ||
      params.model.trim() === "" ||
      params.model === "any_model"
    ) {
      delete apiRequest.model;
    }

    // Only include mileage parameters if they are actually provided
    if (!params.minMileage || params.minMileage.trim() === "") {
      delete apiRequest.minMileage;
    }
    if (!params.maxMileage || params.maxMileage.trim() === "") {
      delete apiRequest.maxMileage;
    }

    // Only include price parameters if they are actually provided
    if (!params.minPrice || params.minPrice.trim() === "") {
      delete apiRequest.minPrice;
    }
    if (!params.maxPrice || params.maxPrice.trim() === "") {
      delete apiRequest.maxPrice;
    }

    // Only include age parameters if they are actually provided and valid
    if (
      !params.minYear ||
      params.minYear === "any_min_year" ||
      apiRequest.minAge === undefined
    ) {
      delete apiRequest.minAge;
    }
    if (
      !params.maxYear ||
      params.maxYear === "any_max_year" ||
      apiRequest.maxAge === undefined ||
      apiRequest.maxAge < 1
    ) {
      delete apiRequest.maxAge;
    }

    console.log("Converted search params to API format:", apiRequest);
    return apiRequest;
  }

  // Convert backend API vehicle to frontend format
  convertApiVehicleToVehicle(apiVehicle: Record<string, unknown>): Vehicle {
    console.log("Converting API vehicle:", apiVehicle);

    // Handle different possible response formats from backend
    const vehicle: Vehicle = {
      id:
        (apiVehicle.id as string) ||
        `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      title:
        (apiVehicle.title as string) ||
        (apiVehicle.primaryVehicleDescription as string) ||
        (apiVehicle.make as string) + " " + (apiVehicle.model as string) ||
        "Unknown Vehicle",
      price:
        (apiVehicle.price as string) || (apiVehicle.price as number) || "0",
      imageUrl:
        (apiVehicle.imageUrl as string) ||
        (apiVehicle.image as string) ||
        "https://via.placeholder.com/400",
      location:
        (apiVehicle.location as string) ||
        (apiVehicle.localSaleLocation as string) ||
        (apiVehicle.dealer as string) ||
        "Unknown",
      registration:
        (apiVehicle.registration as string) ||
        (apiVehicle.reg as string) ||
        (apiVehicle.vrm as string) ||
        "Unknown",
      source:
        (apiVehicle.source as string) ||
        (apiVehicle.website as string) ||
        "Unknown Source",
      url: (apiVehicle.url as string) || "#",
      timestamp: new Date().toISOString(),
      mileage: (apiVehicle.mileage as number) || undefined,
    };

    console.log("Converted to frontend vehicle:", vehicle);
    return vehicle;
  }

  // Main search method that calls the backend API
  async searchVehicles(searchRequest: ApiSearchRequest): Promise<ApiResponse> {
    try {
      console.log("=== API SERVICE DEBUG START ===");
      console.log("Making API request to backend:", searchRequest);
      console.log("API URL:", `${this.baseUrl}/api/scrape`);

      const response = await fetch(`${this.baseUrl}/api/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchRequest),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
      console.log("=== RAW API RESPONSE DEBUG ===");
      console.log("Raw API response:", rawData);
      console.log("Raw response type:", typeof rawData);
      console.log("Raw response is array:", Array.isArray(rawData));
      console.log("Raw response keys:", Object.keys(rawData || {}));

      // Handle different response formats
      let data: ApiResponse;

      if (rawData.success !== undefined) {
        // Standard format: { success: true, data: [...] }
        console.log("Using standard format");
        data = rawData;
      } else if (Array.isArray(rawData)) {
        // Direct array format: [...]
        console.log("Using direct array format");
        data = { success: true, data: rawData };
      } else {
        // Unknown format, try to extract data
        console.log("Using unknown format, trying to extract data");
        data = { success: true, data: rawData.data || rawData.results || [] };
      }

      console.log("=== PROCESSED API RESPONSE DEBUG ===");
      console.log("Processed API response:", data);
      console.log("Processed success:", data.success);
      console.log("Processed data type:", typeof data.data);
      console.log("Processed data is array:", Array.isArray(data.data));
      console.log("Processed data length:", data.data?.length);
      console.log("=== API SERVICE DEBUG END ===");

      return data;
    } catch (error) {
      console.error("=== API SERVICE ERROR DEBUG ===");
      console.error("API request failed:", error);
      console.error("Error type:", typeof error);
      console.error(
        "Error message:",
        error instanceof Error ? error.message : "Unknown error"
      );
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Test API connectivity
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          minPrice: 10000,
          maxPrice: 50000,
          minMileage: 0,
          maxMileage: 100000,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("API connection test failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const vehicleApiService = new VehicleApiService();
