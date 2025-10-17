import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Search } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import { Vehicle } from "@/services/api/vehicleApi";
import { SearchParams } from "@/services/search/types";

// Add a separate interface for vehicles with errors
interface SearchError {
  source: string;
  error: string;
}

interface VehicleResultsProps {
  vehicles: Vehicle[];
  isLoading?: boolean;
  searchPerformed?: boolean;
  searchErrors?: SearchError[];
  searchParams?: SearchParams | null;
}

export default function VehicleResults({
  vehicles = [],
  isLoading = false,
  searchPerformed = false,
  searchErrors = [],
  searchParams = null,
}: VehicleResultsProps) {
  // Debug logging
  console.log("VehicleResults received props:", {
    vehiclesCount: vehicles.length,
    vehicles: vehicles,
    isLoading,
    searchPerformed,
    searchErrorsCount: searchErrors.length,
  });

  // Add search state
  const [titleSearchTerm, setTitleSearchTerm] = useState("");

  // Filter vehicles by title search term
  const filteredVehicles = useMemo(() => {
    if (!titleSearchTerm.trim()) {
      return vehicles;
    }
    return vehicles.filter((vehicle) =>
      vehicle.title.toLowerCase().includes(titleSearchTerm.toLowerCase())
    );
  }, [vehicles, titleSearchTerm]);

  const resultGroups = {
    all: filteredVehicles,
    bca: filteredVehicles.filter(
      (v) => v.source === "BCA Marketplace" || v.source === "BCA"
    ),
    motorway: filteredVehicles.filter(
      (v) => v.source === "Motorway" || v.source === "Motorway Pro"
    ),
    carwow: filteredVehicles.filter((v) => v.source === "CarWow"),
    cartotrade: filteredVehicles.filter((v) => v.source === "CarToTrade"),
    disposalnetwork: filteredVehicles.filter(
      (v) => v.source === "DisposalNetwork"
    ),
    others: filteredVehicles.filter(
      (v) =>
        ![
          "BCA Marketplace",
          "BCA",
          "Motorway",
          "Motorway Pro",
          "CarWow",
          "CarToTrade",
          "DisposalNetwork",
        ].includes(v.source)
    ),
  };

  // Check if there are any search errors
  const hasSearchErrors = searchErrors.length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Searching...</CardTitle>
          <CardDescription>
            Fetching vehicle data from dealer websites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col space-y-3">
                <div className="h-[200px] rounded-md bg-muted animate-pulse-subtle"></div>
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded-md bg-muted animate-pulse-subtle"></div>
                  <div className="h-4 w-1/2 rounded-md bg-muted animate-pulse-subtle"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!searchPerformed) {
    console.log("VehicleResults: No search performed yet");
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Results</CardTitle>
          <CardDescription>Search for vehicles to see results</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">No search performed yet</p>
        </CardContent>
      </Card>
    );
  }

  if (vehicles.length === 0 && searchPerformed) {
    console.log("VehicleResults: Search performed but no vehicles found");
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Results Found</CardTitle>
          <CardDescription>
            No vehicles matching your search criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasSearchErrors ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Search Errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-2">
                  {searchErrors.map((error, index) => (
                    <li key={index}>
                      <strong>{error.source}:</strong> {error.error}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-col items-center justify-center h-48">
              <p className="text-muted-foreground">
                Try adjusting your search parameters
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  console.log(
    "VehicleResults: Rendering results with",
    filteredVehicles.length,
    "vehicles"
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Results</CardTitle>
        <CardDescription>
          Found {filteredVehicles.length} vehicles matching your criteria
          {titleSearchTerm && (
            <span className="text-muted-foreground">
              {" "}
              (filtered by "{titleSearchTerm}")
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasSearchErrors && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Some searches encountered errors</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 mt-2">
                {searchErrors.map((error, index) => (
                  <li key={index}>
                    <strong>{error.source}:</strong> {error.error}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Title Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search vehicles by title..."
              value={titleSearchTerm}
              onChange={(e) => setTitleSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {titleSearchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing {filteredVehicles.length} of {vehicles.length} vehicles
            </p>
          )}
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">
              All ({resultGroups.all.length})
            </TabsTrigger>
            <TabsTrigger value="bca">
              BCA ({resultGroups.bca.length})
            </TabsTrigger>
            <TabsTrigger value="motorway">
              Motorway ({resultGroups.motorway.length})
            </TabsTrigger>
            <TabsTrigger value="carwow">
              CarWow ({resultGroups.carwow.length})
            </TabsTrigger>
            <TabsTrigger value="cartotrade">
              CarToTrade ({resultGroups.cartotrade.length})
            </TabsTrigger>
            <TabsTrigger value="disposalnetwork">
              DisposalNetwork ({resultGroups.disposalnetwork.length})
            </TabsTrigger>
            <TabsTrigger value="others">
              Others ({resultGroups.others.length})
            </TabsTrigger>
          </TabsList>

          {Object.entries(resultGroups).map(([key, groupVehicles]) => (
            <TabsContent key={key} value={key} className="mt-4">
              {/* VAT Qualifying Warning for non-BCA tabs */}
              {searchParams?.vatQualifying &&
                key !== "bca" &&
                key !== "all" && (
                  <Alert className="mb-4 border-amber-200 bg-amber-50">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">
                      VAT Qualifying Filter Not Available
                    </AlertTitle>
                    <AlertDescription className="text-amber-700">
                      VAT qualifying filtering is not available for{" "}
                      {key === "motorway"
                        ? "Motorway"
                        : key === "carwow"
                        ? "CarWow"
                        : key === "cartotrade"
                        ? "CarToTrade"
                        : key === "disposalnetwork"
                        ? "DisposalNetwork"
                        : key === "others"
                        ? "other sources"
                        : key}
                      . All vehicles from this source are shown regardless of
                      VAT qualification status.
                    </AlertDescription>
                  </Alert>
                )}

              {groupVehicles.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-muted-foreground">
                    {titleSearchTerm
                      ? `No vehicles found from this source matching "${titleSearchTerm}"`
                      : "No vehicles found from this source"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupVehicles.map((vehicle) => (
                    <Card key={vehicle.id}>
                      <div className="h-[200px] overflow-hidden relative">
                        <img
                          src={vehicle.imageUrl}
                          alt={vehicle.title}
                          className="w-full h-full object-cover"
                        />
                        <Badge className="absolute top-2 right-2">
                          {vehicle.source}
                        </Badge>
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl">
                          {vehicle.title}
                        </CardTitle>
                        <CardDescription>
                          {vehicle.location} • {vehicle.registration}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                          <div>
                            <p className="text-muted-foreground">Price</p>
                            <p className="font-medium">
                              {vehicle.source === "CarWow" ||
                              vehicle.source === "CarToTrade"
                                ? ""
                                : "£"}
                              {typeof vehicle.price === "string"
                                ? vehicle.price
                                : vehicle.price.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Location</p>
                            <p className="font-medium">{vehicle.location}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Registration
                            </p>
                            <p className="font-medium">
                              {vehicle.registration}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Source</p>
                            <p className="font-medium">{vehicle.source}</p>
                          </div>
                          {vehicle.mileage && (
                            <div>
                              <p className="text-muted-foreground">Mileage</p>
                              <p className="font-medium">
                                {vehicle.mileage.toLocaleString()} miles
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                          className="w-full"
                          onClick={() => window.open(vehicle.url, "_blank")}
                        >
                          Show Details
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
