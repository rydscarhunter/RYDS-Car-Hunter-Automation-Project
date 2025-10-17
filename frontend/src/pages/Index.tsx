import { useState, useEffect } from "react";
import SearchForm from "@/components/search/SearchForm";
import VehicleResults from "@/components/results/VehicleResults";
import { useToast } from "@/hooks/use-toast";
import { vehicleSearchService } from "@/services/search/vehicleSearch";
import { SearchResult, SearchParams } from "@/services/search/types";
import {
  Vehicle,
  ApiVehicle,
  vehicleApiService,
} from "@/services/api/vehicleApi";
import { SSEConnectedEvent } from "@/services/api/scrapeSSEApi";
import { supabase } from "@/lib/supabase";

// Interface for search errors
interface SearchError {
  source: string;
  error: string;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchErrors, setSearchErrors] = useState<SearchError[]>([]);
  const [currentSearchParams, setCurrentSearchParams] =
    useState<SearchParams | null>(null);

  // SSE search state
  const [isSSESearchActive, setIsSSESearchActive] = useState(false);
  const [useSSE, setUseSSE] = useState(true); // Toggle between regular and SSE search
  const [sseProgress, setSseProgress] = useState<{
    totalSites: number;
    sitesCompleted: number;
    totalCars: number;
  }>({ totalSites: 0, sitesCompleted: 0, totalCars: 0 });
  const [siteResults, setSiteResults] = useState<
    Record<string, { cars: ApiVehicle[]; completed: boolean }>
  >({});

  const { toast } = useToast();

  // Enhanced logging for debugging
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        // Get current user session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        console.log("Current user ID:", userId);
      } catch (err) {
        console.error("Error fetching debug details:", err);
      }
    };

    fetchUserDetails();
  }, []);

  // Cleanup SSE search on unmount only
  useEffect(() => {
    return () => {
      // Only stop SSE when component unmounts, not when isSSESearchActive changes
      vehicleSearchService.stopSSESearch();
    };
  }, []); // Empty dependency array - only runs on unmount

  const handleSearch = async (searchValues: SearchParams) => {
    try {
      console.log("🔍 [Index] Starting vehicle search");
      console.log("📋 [Index] Search parameters:", searchValues);

      setIsLoading(true);
      setSearchErrors([]);
      setVehicles([]);
      setSearchPerformed(false);
      setCurrentSearchParams(searchValues); // Store search parameters

      if (useSSE) {
        console.log("🚀 [Index] Using SSE-based real-time search");

        // Reset SSE state
        setIsSSESearchActive(true);
        setSseProgress({ totalSites: 0, sitesCompleted: 0, totalCars: 0 }); // totalSites will be updated by onConnected
        setSiteResults({});

        // Use SSE-based search for real-time results
        try {
          console.log("📡 [Index] Initiating SSE connection");
          await vehicleSearchService.searchVehiclesWithSSE(
            searchValues,
            // onConnected callback
            (event: SSEConnectedEvent) => {
              console.log("🔌 [Index] SSE connection established for search");
              console.log("📊 [Index] Connection event data:", event);

              // Extract totalSites from the connection event
              const totalSites = event?.totalSites || 0;
              console.log(`🏢 [Index] Total sites to scrape: ${totalSites}`);

              // Update the progress state with the total sites count immediately
              setSseProgress((prev) => ({
                ...prev,
                totalSites: totalSites,
              }));
              console.log("✅ [Index] Progress state updated with totalSites");
            },
            // onProgress callback

            (siteName, cars, totalSites, currentSite) => {
              console.log(
                `📊 [Index] Progress callback from ${siteName}: ${cars.length} cars`
              );
              console.log(
                `🏢 [Index] Site ${currentSite} of ${totalSites} completed`
              );

              // Update site results
              setSiteResults((prev) => ({
                ...prev,
                [siteName]: { cars, completed: true },
              }));

              // Update progress
              setSseProgress((prev) => {
                const newProgress = {
                  totalSites,
                  sitesCompleted: currentSite,
                  totalCars: prev.totalCars + cars.length,
                };
                console.log("📈 [Index] Progress updated:", newProgress);
                return newProgress;
              });

              // Convert API vehicles to frontend format and add to vehicles list
              console.log(
                `🔄 [Index] Converting ${cars.length} vehicles from ${siteName}`
              );
              const convertedVehicles = cars.map((apiVehicle) => {
                return vehicleApiService.convertApiVehicleToVehicle(apiVehicle);
              });
              console.log(
                `✅ [Index] Successfully converted ${convertedVehicles.length} vehicles`
              );

              setVehicles((prev) => {
                const newVehicles = [...prev, ...convertedVehicles];
                console.log(
                  `🚗 [Index] Vehicles state updated: ${prev.length} → ${newVehicles.length} total vehicles`
                );
                return newVehicles;
              });

              // Only set searchPerformed to true if we actually have vehicles
              if (convertedVehicles.length > 0) {
                console.log(
                  "✅ [Index] Setting searchPerformed to true (vehicles found)"
                );
                setSearchPerformed(true);
                // Set loading to false since we have results
                setIsLoading(false);
                console.log("🔄 [Index] Loading state set to false");
              } else {
                console.log(
                  "ℹ️ [Index] No vehicles found, keeping searchPerformed false"
                );
              }

              // Show progress toast
              toast({
                title: `${siteName} Complete`,
                description: `Found ${cars.length} vehicles from ${siteName}`,
              });
            },
            // onComplete callback
            (results) => {
              console.log("🏁 [Index] SSE search completed");
              console.log(
                `📊 [Index] Final results: ${results.length} total vehicles`
              );

              setIsSSESearchActive(false);
              setIsLoading(false);

              // Ensure search is marked as performed and vehicles remain visible
              setSearchPerformed(true);

              // Don't add vehicles again - they're already in state from onProgress
              // The results from onComplete are the same vehicles we already processed
              console.log(
                "✅ [Index] Search marked as completed, vehicles remain visible"
              );

              toast({
                title: "Search Complete",
                description: `Found ${results.length} vehicles across all websites`,
              });
            },
            // onError callback
            (errorMessage) => {
              console.error("❌ [Index] SSE search error:", errorMessage);
              setIsSSESearchActive(false);
              setIsLoading(false);
              console.log(
                "🔄 [Index] Error state: SSE inactive, loading false"
              );

              toast({
                title: "Search Error",
                description: errorMessage,
                variant: "destructive",
              });
            }
          );

          // Fallback: If SSE connection doesn't establish within 2 seconds, set default totalSites
          setTimeout(() => {
            console.log("⏰ [Index] Fallback timeout triggered (2 seconds)");
            setSseProgress((prev) => {
              if (prev.totalSites === 0) {
                console.log("🔄 [Index] Setting fallback totalSites: 5");
                return { ...prev, totalSites: 5 };
              }
              console.log(
                `ℹ️ [Index] Fallback not needed, totalSites already: ${prev.totalSites}`
              );
              return prev;
            });
          }, 2000);
        } catch (sseError) {
          console.error("❌ [Index] SSE search failed with error:", sseError);

          // Set default totalSites if SSE fails
          setSseProgress((prev) => ({ ...prev, totalSites: 5 }));
          setIsSSESearchActive(false);
          console.log(
            "🔄 [Index] Error recovery: SSE inactive, totalSites set to 5"
          );

          toast({
            title: "SSE Connection Failed",
            description:
              "Real-time search failed, but you can still use regular search.",
            variant: "destructive",
          });
        }
      } else {
        console.log("🔍 [Index] Using regular (non-SSE) search");

        // Use regular search
        const searchResults = await vehicleSearchService.searchVehicles(
          searchValues
        );

        // Combine all vehicle results
        const allVehicles = searchResults.flatMap((result) => result.vehicles);

        // Extract search errors
        const errors = searchResults
          .filter((result) => result.error)
          .map((result) => ({
            source: result.source,
            error: result.error || "Unknown error",
          }));

        setSearchErrors(errors);

        if (errors.length > 0) {
          // Display errors for failed searches
          toast({
            title: "Some searches failed",
            description: errors
              .map((e) => `${e.source}: ${e.error}`)
              .join(", "),
            variant: "destructive",
          });
        }

        setVehicles(allVehicles);
        setSearchPerformed(true);

        if (allVehicles.length > 0) {
          toast({
            title: "Search Complete",
            description: `Found ${allVehicles.length} vehicles matching your criteria from ${searchResults.length} website(s)`,
          });
        } else if (errors.length === 0) {
          toast({
            title: "No Results",
            description: "No vehicles found matching your search criteria",
          });
        }

        setIsLoading(false);
      }
    } catch (error) {
      console.error("Search error:", error);
      setIsSSESearchActive(false);
      setIsLoading(false);

      toast({
        title: "Search Error",
        description: "An error occurred while searching. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Vehicle Search</h1>
        <p className="text-muted-foreground mt-2">
          Search across multiple dealer websites for available vehicles
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Search Mode Toggle */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Search Mode</h3>
              <p className="text-sm text-gray-600">
                {useSSE
                  ? "Real-time search with live progress updates"
                  : "Traditional search - wait for all results"}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span
                className={`text-sm ${
                  !useSSE ? "text-gray-900" : "text-gray-500"
                }`}
              >
                Regular
              </span>
              <button
                onClick={() => setUseSSE(!useSSE)}
                title={`Switch to ${
                  useSSE ? "regular" : "real-time"
                } search mode`}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useSSE ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useSSE ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-sm ${
                  useSSE ? "text-blue-600 font-medium" : "text-gray-500"
                }`}
              >
                Real-time
              </span>
            </div>
          </div>
        </div>

        <SearchForm onSubmit={handleSearch} isLoading={isLoading} />

        {/* Real-time Progress Display */}
        {isSSESearchActive && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <h3 className="text-lg font-semibold text-blue-800">
                🔍 Real-time Search Progress
              </h3>
            </div>

            {/* Initial Loading State */}
            {sseProgress.totalSites === 0 && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-blue-700 font-medium">
                  Initializing search...
                </p>
                <p className="text-blue-600 text-sm">
                  Connecting to vehicle websites
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-blue-700">Progress:</span>
                <span className="font-semibold text-blue-800">
                  {sseProgress.sitesCompleted} of {sseProgress.totalSites} sites
                  completed
                </span>
              </div>

              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width:
                      sseProgress.totalSites > 0
                        ? `${
                            (sseProgress.sitesCompleted /
                              sseProgress.totalSites) *
                            100
                          }%`
                        : "0%",
                  }}
                ></div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {sseProgress.totalCars}
                  </div>
                  <div className="text-sm text-blue-600">Total Cars Found</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {sseProgress.sitesCompleted}
                  </div>
                  <div className="text-sm text-green-600">Sites Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {sseProgress.totalSites}
                  </div>
                  <div className="text-sm text-purple-600">Total Sites</div>
                </div>
              </div>

              {/* Site Results Summary */}
              {Object.keys(siteResults).length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-blue-800 mb-2">
                    Site Results:
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(siteResults).map(([siteName, siteData]) => (
                      <div
                        key={siteName}
                        className="bg-white border border-blue-200 rounded p-3"
                      >
                        <div className="font-medium text-blue-700 capitalize">
                          {siteName}
                        </div>
                        <div className="text-sm text-blue-600">
                          {siteData.cars.length} cars found
                        </div>
                        {siteData.completed ? (
                          <div className="text-xs text-green-600 flex items-center">
                            <span className="mr-1">✓</span> Complete
                          </div>
                        ) : (
                          <div className="text-xs text-blue-600 flex items-center">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                            Processing...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Debug info */}
        {/* {process.env.NODE_ENV === "development" && (
          <div className="bg-gray-100 border border-gray-300 rounded p-4 text-sm">
            <h4 className="font-medium mb-2">Debug Info:</h4>
            <div>Vehicles count: {vehicles.length}</div>
            <div>Search performed: {searchPerformed ? "Yes" : "No"}</div>
            <div>Is loading: {isLoading ? "Yes" : "No"}</div>
            <div>SSE active: {isSSESearchActive ? "Yes" : "No"}</div>
            <div>Site results: {Object.keys(siteResults).length}</div>
          </div>
        )} */}

        <VehicleResults
          vehicles={vehicles}
          isLoading={isLoading}
          searchPerformed={searchPerformed}
          searchErrors={searchErrors}
          searchParams={currentSearchParams}
        />
      </div>
    </div>
  );
};

export default Index;
