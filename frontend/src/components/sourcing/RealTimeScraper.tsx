import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Play,
  Square,
  Car,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Loader2,
} from "lucide-react";
import { scrapeSSEApiService, SSEEvent } from "@/services/api/scrapeSSEApi";
import { ApiSearchRequest, ApiVehicle } from "@/services/api/vehicleApi";

interface ScrapingStats {
  totalCars: number;
  sitesCompleted: number;
  totalSites: number;
  startTime: Date | null;
  endTime: Date | null;
}

interface SiteResults {
  [siteName: string]: {
    cars: ApiVehicle[];
    completed: boolean;
    error?: string;
  };
}

export default function RealTimeScraper() {
  const [isScraping, setIsScraping] = useState(false);
  const [stats, setStats] = useState<ScrapingStats>({
    totalCars: 0,
    sitesCompleted: 0,
    totalSites: 0,
    startTime: null,
    endTime: null,
  });
  const [siteResults, setSiteResults] = useState<SiteResults>({});
  const [allResults, setAllResults] = useState<ApiVehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<ApiSearchRequest>({
    make: "BMW",
    model: "3 Series",
    minPrice: 10000,
    maxPrice: 50000,
    minMileage: 0,
    maxMileage: 100000,
  });

  // Global error handler
  const handleError = useCallback((errorMessage: string) => {
    console.error("RealTimeScraper error:", errorMessage);
    setError(errorMessage);
    setIsScraping(false);
    setStats((prev) => ({ ...prev, endTime: new Date() }));
  }, []);

  // Reset state when starting new scraping
  const resetState = useCallback(() => {
    setStats({
      totalCars: 0,
      sitesCompleted: 0,
      totalSites: 0,
      startTime: null,
      endTime: null,
    });
    setSiteResults({});
    setAllResults([]);
    setError(null);
  }, []);

  // Start scraping
  const startScraping = useCallback(async () => {
    if (isScraping) return;

    resetState();
    setIsScraping(true);
    setStats((prev) => ({ ...prev, startTime: new Date() }));

    try {
      await scrapeSSEApiService.startScraping(searchParams, {
        onConnected: () => {
          console.log("SSE connection established");
          console.log("Connection event received");
        },
        onProgress: (event: SSEEvent) => {
          console.log("SSE Progress event received:", event);
          try {
            if (event.type === "progress") {
              console.log(
                "Processing progress event for site:",
                event.siteName
              );
              console.log("Cars received:", event.cars);
              console.log("Cars type:", typeof event.cars);
              console.log("Cars is array:", Array.isArray(event.cars));
              console.log("Cars length:", event.cars?.length);

              if (event.cars && Array.isArray(event.cars)) {
                console.log("First car sample:", event.cars[0]);
                console.log(
                  "All car keys:",
                  event.cars.map((car) => Object.keys(car || {}))
                );
                console.log(
                  "Sample car data structure:",
                  JSON.stringify(event.cars[0], null, 2)
                );
              }

              // Validate and filter out invalid car data
              // Cars might have different structures depending on the site
              const validCars =
                event.cars?.filter(
                  (car) =>
                    car &&
                    typeof car === "object" &&
                    (car.make ||
                      car.model ||
                      car.title ||
                      car.name ||
                      car.primaryVehicleDescription)
                ) || [];

              console.log("Valid cars after filtering:", validCars);
              console.log("Valid cars count:", validCars.length);

              setSiteResults((prev) => {
                const newResults = {
                  ...prev,
                  [event.siteName]: {
                    cars: validCars,
                    completed: true,
                  },
                };
                console.log("Updated site results:", newResults);
                return newResults;
              });

              setStats((prev) => {
                const newStats = {
                  ...prev,
                  totalCars: prev.totalCars + validCars.length,
                  sitesCompleted: event.currentSite,
                  totalSites: event.totalSites,
                };
                console.log("Updated stats:", newStats);
                return newStats;
              });

              setAllResults((prev) => {
                const newAllResults = [...prev, ...validCars];
                console.log("Updated all results:", newAllResults);
                return newAllResults;
              });
            } else {
              console.warn(
                "Progress event missing cars data or wrong format:",
                event
              );
            }
          } catch (error) {
            console.error("Error processing progress event:", error);
            handleError(
              `Error processing results: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        },
        onComplete: (results: ApiVehicle[]) => {
          console.log("SSE Complete event received:", results);
          setStats((prev) => ({ ...prev, endTime: new Date() }));
          setIsScraping(false);
          console.log("Scraping completed with", results.length, "cars");
        },
        onError: (errorMessage: string) => {
          handleError(errorMessage);
        },
      });
    } catch (error) {
      console.error("Failed to start scraping:", error);
      handleError(error instanceof Error ? error.message : "Unknown error");
    }
  }, [isScraping, searchParams, resetState, handleError]);

  // Stop scraping
  const stopScraping = useCallback(() => {
    scrapeSSEApiService.stopScraping();
    setIsScraping(false);
    setStats((prev) => ({ ...prev, endTime: new Date() }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isScraping) {
        scrapeSSEApiService.stopScraping();
      }
    };
  }, [isScraping]);

  // Calculate progress percentage
  const progressPercentage =
    stats.totalSites > 0 ? (stats.sitesCompleted / stats.totalSites) * 100 : 0;

  // Debug logging for state values
  console.log("Current state:", {
    isScraping,
    stats,
    siteResults: Object.keys(siteResults),
    allResultsLength: allResults.length,
    error,
  });

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!stats.startTime) return "0s";
    const endTime = stats.endTime || new Date();
    const elapsed = Math.floor(
      (endTime.getTime() - stats.startTime.getTime()) / 1000
    );
    if (elapsed < 60) return `${elapsed}s`;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Get status badge
  const getStatusBadge = () => {
    if (error) {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800">
          Error
        </Badge>
      );
    }
    if (isScraping) {
      return (
        <Badge variant="default" className="bg-blue-100 text-blue-800">
          Scraping
        </Badge>
      );
    }
    if (stats.endTime) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800">
          Completed
        </Badge>
      );
    }
    return <Badge variant="secondary">Ready</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Real-Time Car Scraper</h2>
          <p className="text-muted-foreground mt-1">
            Search for vehicles across multiple dealer websites in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {isScraping && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {getElapsedTime()}
            </div>
          )}
        </div>
      </div>

      {/* Search Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Parameters
          </CardTitle>
          <CardDescription>
            Configure your vehicle search criteria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="make" className="text-sm font-medium">
                Make
              </label>
              <input
                id="make"
                type="text"
                value={searchParams.make}
                onChange={(e) =>
                  setSearchParams((prev) => ({ ...prev, make: e.target.value }))
                }
                className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
                disabled={isScraping}
                placeholder="e.g., BMW"
                title="Vehicle make"
              />
            </div>
            <div>
              <label htmlFor="model" className="text-sm font-medium">
                Model
              </label>
              <input
                id="model"
                type="text"
                value={searchParams.model}
                onChange={(e) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    model: e.target.value,
                  }))
                }
                className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
                disabled={isScraping}
                placeholder="e.g., 3 Series"
                title="Vehicle model"
              />
            </div>
            <div>
              <label htmlFor="minPrice" className="text-sm font-medium">
                Min Price
              </label>
              <input
                id="minPrice"
                type="number"
                value={searchParams.minPrice}
                onChange={(e) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    minPrice: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
                disabled={isScraping}
                placeholder="0"
                title="Minimum price in pounds"
              />
            </div>
            <div>
              <label htmlFor="maxPrice" className="text-sm font-medium">
                Max Price
              </label>
              <input
                id="maxPrice"
                type="number"
                value={searchParams.maxPrice}
                onChange={(e) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    maxPrice: parseInt(e.target.value) || 1000000,
                  }))
                }
                className="w-full mt-1 px-3 py-2 border border-input rounded-md text-sm"
                disabled={isScraping}
                placeholder="1000000"
                title="Maximum price in pounds"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={startScraping}
              disabled={isScraping}
              className="flex items-center gap-2"
            >
              {isScraping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isScraping ? "Scraping..." : "Start Scraping"}
            </Button>

            {isScraping && (
              <Button
                variant="outline"
                onClick={stopScraping}
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => {
                // Test button to simulate receiving data
                const testCar = {
                  make: "Test",
                  model: "Car",
                  year: 2023,
                  mileage: 10000,
                  color: "Red",
                  price: 25000,
                  location: "Test Location",
                  source: "Test Source",
                };
                setSiteResults((prev) => ({
                  ...prev,
                  testSite: { cars: [testCar], completed: true },
                }));
                setStats((prev) => ({
                  ...prev,
                  totalCars: 1,
                  sitesCompleted: 1,
                  totalSites: 1,
                }));
                setAllResults([testCar]);
              }}
              className="flex items-center gap-2"
            >
              Test Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress and Stats */}
      {isScraping && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Scraping Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalCars}
                </div>
                <div className="text-sm text-muted-foreground">Total Cars</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.sitesCompleted}
                </div>
                <div className="text-sm text-muted-foreground">
                  Sites Completed
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.totalSites}
                </div>
                <div className="text-sm text-muted-foreground">Total Sites</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">An error occurred during scraping:</p>
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="mt-2"
              >
                Dismiss Error
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {Object.keys(siteResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Scraping Results
            </CardTitle>
            <CardDescription>
              Vehicles found across {Object.keys(siteResults).length} websites
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="sites" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sites">By Site</TabsTrigger>
                <TabsTrigger value="all">All Results</TabsTrigger>
              </TabsList>

              <TabsContent value="sites" className="space-y-4">
                {Object.entries(siteResults).map(([siteName, siteData]) => (
                  <div key={siteName} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        <h4 className="font-semibold capitalize">{siteName}</h4>
                        <Badge variant="outline" className="text-xs">
                          {siteData.cars.length} cars
                        </Badge>
                      </div>
                      {siteData.completed && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>

                    {siteData.error && (
                      <Alert variant="destructive" className="mb-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{siteData.error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {siteData.cars.map((car, index) => (
                        <div key={index} className="border rounded p-3 text-sm">
                          <div className="font-medium">
                            {car.title ||
                              car.name ||
                              car.primaryVehicleDescription ||
                              `${car.make || "Unknown"} ${
                                car.model || "Unknown"
                              }`}
                          </div>
                          <div className="text-muted-foreground">
                            {car.year || "N/A"} •{" "}
                            {(car.mileage || 0).toLocaleString()} miles
                          </div>
                          <div className="font-semibold text-green-600">
                            {siteName === "carwow" || siteName === "cartotrade"
                              ? ""
                              : "£"}
                            {(
                              car.price ||
                              car.capCleanPrice ||
                              0
                            ).toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {car.location || car.localSaleLocation || "Unknown"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="all" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allResults.map((car, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="font-semibold text-lg">
                        {car.title ||
                          car.name ||
                          car.primaryVehicleDescription ||
                          `${car.make || "Unknown"} ${car.model || "Unknown"}`}
                      </div>
                      <div className="text-muted-foreground mb-2">
                        {car.year || "N/A"} •{" "}
                        {(car.mileage || 0).toLocaleString()} miles •{" "}
                        {car.color || "N/A"}
                      </div>
                      <div className="font-bold text-xl text-green-600 mb-2">
                        £
                        {(car.price || car.capCleanPrice || 0).toLocaleString()}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {car.location || car.localSaleLocation || "Unknown"}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {car.source || "Unknown"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
