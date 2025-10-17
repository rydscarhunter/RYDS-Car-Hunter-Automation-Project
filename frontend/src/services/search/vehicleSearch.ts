import { SearchParams, SearchResult } from "./types";
import { Vehicle } from "../api/vehicleApi";
import { vehicleApiService, ApiSearchRequest } from "../api/vehicleApi";
import { scrapeSSEApiService, SSEConnectedEvent } from "../api/scrapeSSEApi";
import { toast } from "@/hooks/use-toast";

// This class handles all search operations using the API
export class VehicleSearchService {
  constructor() {
    console.log("VehicleSearchService initialized with API integration");
  }

  // Main search method that coordinates searches via API
  async searchVehicles(params: SearchParams): Promise<SearchResult[]> {
    try {
      console.log("=== SEARCH DEBUG START ===");
      console.log("Searching vehicles with params:", params);

      // Convert search params to API format
      const apiSearchRequest =
        vehicleApiService.convertSearchParamsToApi(params);
      console.log("API request:", apiSearchRequest);

      // Make API request
      const apiResponse = await vehicleApiService.searchVehicles(
        apiSearchRequest
      );

      console.log("=== API RESPONSE DEBUG ===");
      console.log("API response received:", apiResponse);
      console.log("API response type:", typeof apiResponse);
      console.log("API response success:", apiResponse.success);
      console.log("API response data type:", typeof apiResponse.data);
      console.log(
        "API response data is array:",
        Array.isArray(apiResponse.data)
      );
      console.log("API response data length:", apiResponse.data?.length);

      if (!apiResponse.success) {
        console.log("API returned success: false");
        toast({
          title: "Search Failed",
          description: apiResponse.error || "Failed to search vehicles",
          variant: "destructive",
        });

        return [
          {
            vehicles: [],
            source: "All Websites",
            error: apiResponse.error || "API search failed",
          },
        ];
      }

      // Check if we have data
      if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
        console.log("=== NO DATA DEBUG ===");
        console.warn(
          "API returned no data or invalid data format:",
          apiResponse.data
        );
        console.log("Data is null/undefined:", apiResponse.data == null);
        console.log("Data is not array:", !Array.isArray(apiResponse.data));
        return [
          {
            vehicles: [],
            source: "All Websites",
            error: "No data returned from API",
          },
        ];
      }

      console.log("=== DATA PROCESSING DEBUG ===");
      console.log("API returned data array:", apiResponse.data);
      console.log("Data array length:", apiResponse.data.length);
      console.log("First item in data:", apiResponse.data[0]);

      // Convert API response to our format
      const vehicles = apiResponse.data.map((apiVehicle, index) => {
        console.log(`Converting vehicle ${index}:`, apiVehicle);
        const converted =
          vehicleApiService.convertApiVehicleToVehicle(apiVehicle);
        console.log(`Converted vehicle ${index}:`, converted);
        return converted;
      });

      console.log("=== VEHICLES DEBUG ===");
      console.log("Converted vehicles:", vehicles);
      console.log("Converted vehicles length:", vehicles.length);
      console.log("First converted vehicle:", vehicles[0]);

      // Group vehicles by source
      const vehiclesBySource = this.groupVehiclesBySource(vehicles);

      console.log("=== GROUPING DEBUG ===");
      console.log("Grouped vehicles by source:", vehiclesBySource);
      console.log("Number of sources:", Object.keys(vehiclesBySource).length);

      // Convert to SearchResult format
      const results: SearchResult[] = Object.entries(vehiclesBySource).map(
        ([source, sourceVehicles]) => {
          console.log(
            `Creating result for source "${source}" with ${sourceVehicles.length} vehicles`
          );
          return {
            vehicles: sourceVehicles,
            source: source,
            ...(sourceVehicles.length === 0 && {
              error: "No vehicles found from this source",
            }),
          };
        }
      );

      console.log("=== RESULTS DEBUG ===");
      console.log("Final results:", results);
      console.log("Number of results:", results.length);

      // If no vehicles found at all, return a generic result
      if (results.length === 0) {
        console.log("No results created, adding generic result");
        results.push({
          vehicles: [],
          source: "All Websites",
          error: "No vehicles found matching your criteria",
        });
      }

      // Count total vehicles found
      const totalVehicles = results.reduce(
        (sum, result) => sum + result.vehicles.length,
        0
      );
      console.log(
        `Found ${totalVehicles} vehicles across ${results.length} websites`
      );
      console.log("=== SEARCH DEBUG END ===");

      return results;
    } catch (error) {
      console.error("=== ERROR DEBUG ===");
      console.error("Error in searchVehicles:", error);
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack"
      );
      throw error;
    }
  }

  // Group vehicles by their source
  private groupVehiclesBySource(
    vehicles: Vehicle[]
  ): Record<string, Vehicle[]> {
    const grouped: Record<string, Vehicle[]> = {};

    // Group vehicles by source
    vehicles.forEach((vehicle) => {
      if (!grouped[vehicle.source]) {
        grouped[vehicle.source] = [];
      }
      grouped[vehicle.source].push(vehicle);
    });

    return grouped;
  }

  // SSE-based search method for real-time results
  async searchVehiclesWithSSE(
    params: SearchParams,
    onConnected?: (event: SSEConnectedEvent) => void,
    onProgress?: (
      siteName: string,
      cars: any[],
      totalSites: number,
      currentSite: number
    ) => void,
    onComplete?: (results: any[]) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    try {
      console.log("🔍 [VehicleSearch] Starting SSE-based vehicle search");
      console.log("📋 [VehicleSearch] Search parameters:", params);
      console.log("🔗 [VehicleSearch] Callbacks provided:", {
        onConnected: !!onConnected,
        onProgress: !!onProgress,
        onComplete: !!onComplete,
        onError: !!onError,
      });

      // Convert search params to API format
      console.log("🔄 [VehicleSearch] Converting search params to API format");
      const apiSearchRequest =
        vehicleApiService.convertSearchParamsToApi(params);
      console.log("📤 [VehicleSearch] API request prepared:", apiSearchRequest);

      // Start SSE scraping
      await scrapeSSEApiService.startScraping(apiSearchRequest, {
        onConnected: (event) => {
          console.log(
            "🔌 [VehicleSearch] SSE connection established, calling onConnected callback"
          );
          onConnected?.(event); // Call the passed onConnected callback with event data
        },
        onProgress: (event) => {
          if (event.type === "progress") {
            console.log(
              `📊 [VehicleSearch] Progress event from ${event.siteName}: ${event.cars.length} cars`
            );
            if (onProgress) {
              try {
                onProgress(
                  event.siteName,
                  event.cars,
                  event.totalSites,
                  event.currentSite
                );
                console.log(
                  "✅ [VehicleSearch] onProgress callback executed successfully"
                );
              } catch (error) {
                console.error(
                  "❌ [VehicleSearch] Error executing onProgress callback:",
                  error
                );
              }
            } else {
              console.log("⚠️ [VehicleSearch] No onProgress callback provided");
            }
          }
        },
        onComplete: (results) => {
          console.log(
            `✅ [VehicleSearch] Search completed with ${results.length} total results`
          );
          onComplete?.(results);
        },
        onError: (errorMessage) => {
          console.error("❌ [VehicleSearch] SSE search error:", errorMessage);
          onError?.(errorMessage);
        },
      });
    } catch (error) {
      console.error(
        "❌ [VehicleSearch] Unexpected error in searchVehiclesWithSSE:",
        error
      );
      onError?.(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  }

  // Stop SSE search
  stopSSESearch(): void {
    console.log("🛑 [VehicleSearch] Stopping SSE search");
    scrapeSSEApiService.stopScraping();
  }

  // Check if SSE search is active
  isSSESearchActive(): boolean {
    const isActive = scrapeSSEApiService.isScraping();
    console.log(`ℹ️ [VehicleSearch] SSE search active: ${isActive}`);
    return isActive;
  }
}

// Export a singleton instance
export const vehicleSearchService = new VehicleSearchService();
