import React, { useEffect, useMemo } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, Loader2, RotateCcw } from "lucide-react";

const searchFormSchema = z
  .object({
    make: z.string().optional(),
    model: z.string().optional(),
    color: z.string().optional(),
    vatQualifying: z.boolean().optional(),
    minYear: z.string().optional(),
    maxYear: z.string().optional(),
    minMileage: z.string().optional(),
    maxMileage: z.string().optional(),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate price range
    if (
      data.minPrice &&
      data.maxPrice &&
      data.minPrice.trim() !== "" &&
      data.maxPrice.trim() !== ""
    ) {
      const minPrice = parseInt(data.minPrice);
      const maxPrice = parseInt(data.maxPrice);
      if (!isNaN(minPrice) && !isNaN(maxPrice) && minPrice >= maxPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Max price must be greater than min price",
          path: ["maxPrice"],
        });
      }
    }

    // Validate mileage range
    if (
      data.minMileage &&
      data.maxMileage &&
      data.minMileage.trim() !== "" &&
      data.maxMileage.trim() !== ""
    ) {
      const minMileage = parseInt(data.minMileage);
      const maxMileage = parseInt(data.maxMileage);
      if (
        !isNaN(minMileage) &&
        !isNaN(maxMileage) &&
        minMileage >= maxMileage
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Max mileage must be greater than min mileage",
          path: ["maxMileage"],
        });
      }
    }

    // Validate year range
    if (
      data.minYear &&
      data.maxYear &&
      data.minYear !== "any_min_year" &&
      data.maxYear !== "any_max_year"
    ) {
      const minYear = parseInt(data.minYear);
      const maxYear = parseInt(data.maxYear);
      if (!isNaN(minYear) && !isNaN(maxYear) && minYear >= maxYear) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Max year must be greater than min year",
          path: ["maxYear"],
        });
      }
    }
  });

type SearchFormValues = z.infer<typeof searchFormSchema>;

// Mock data
const carMakes = [
  "Audi",
  "BMW",
  "Bentley",
  "Citroen",
  "Ford",
  "Honda",
  "Fiat",
  "Hyundai",
  "Jaguar",
  "Kia",
  "Land Rover",
  "Lexus",
  "Mazda",
  "Mercedes",
  "Mini",
  "Nissan",
  "Peugeot",
  "Renault",
  "Suzuki",
  "Seat",
  "Skoda",
  "Smart",
  "Tesla",
  "Toyota",
  "Vauxhall",
  "Volkswagen",
  "Volvo",
];

const yearOptions = Array.from({ length: 25 }, (_, i) =>
  (new Date().getFullYear() - i).toString()
);

// Model map - moved outside component to avoid re-creation
const modelMap: Record<string, string[]> = {
  Audi: [
    "A1",
    "A3",
    "A4",
    "A5",
    "A6",
    "A7",
    "A8",
    "E-Tron",
    "Q2",
    "Q3",
    "Q4",
    "Q5",
    "Q7",
    "Q8",
    "R8",
    "RS",
    "TT",
  ],
  BMW: [
    "1 Series",
    "2 Series",
    "3 Series",
    "4 Series",
    "5 Series",
    "6 Series",
    "7 Series",
    "8 Series",
    "Alpina",
    "M Series",
    "X1",
    "X2",
    "X3",
    "X4",
    "X5",
    "X6",
    "X7",
    "Z4",
    "i3",
    "i4",
    "iX",
  ],
  Bentley: ["Bentayga", "Continental", "Flying Spur", "Mulsanne"],
  Citroen: [
    "Berlingo",
    "C1",
    "C3",
    "C4 Picasso",
    "C4",
    "C4 SpaceTourer",
    "C5",
    "DS3 / DS3c",
    "SpaceTourer",
  ],
  Fiat: ["500", "500L", "500X", "Panda", "Punto", "Tipo"],
  Ford: [
    "C-Max",
    "Connect CAR",
    "Ecosport",
    "Edge",
    "Fiesta",
    "Focus",
    "KA",
    "Kuga",
    "Mondeo",
    "Puma",
    "S-Max",
  ],
  Honda: ["Civic", "Jazz"],
  Hyundai: ["Coupe", "Ioniq", "Kona", "i30", "i40"],
  Jaguar: ["F-Pace", "F-Type", "XE", "XF", "XJ", "XK"],
  Kia: ["CEED", "Niro", "Optima", "Picanto"],
  "Land Rover": ["Defender", "Discovery", "Freelander", "Range Rover"],
  Lexus: ["IS", "LS", "NX", "RX", "SC", "UX"],
  Mazda: ["6", "MX-30", "MX-5"],
  Mercedes: [
    "A Class",
    "AMG A",
    "AMG C",
    "AMG E",
    "AMG GLC",
    "AMG GLE",
    "AMG GLS",
    "AMG SLK",
    "B Class",
    "C Class",
    "CLA",
    "CLE",
    "CLK",
    "CLS",
    "E Class",
    "EQA",
    "EQB",
    "EQC",
    "EQE",
    "EQS",
    "EQV",
    "G Class",
    "GL",
    "GLA",
    "GLB",
    "GLC",
    "GLE",
    "GLS",
    "M",
    "Maybach",
    "S",
    "SL",
    "SLC",
    "SLK",
    "V Class",
  ],
  Mini: ["Clubman", "Countryman", "Cooper", "Placeman", "Roadster"],
  Nissan: ["Micra", "NV200", "Qashqai", "Leaf"],
  Peugeot: [
    "108",
    "2008",
    "206",
    "207",
    "208",
    "3008",
    "307",
    "308",
    "407",
    "5008",
    "508",
    "Rifter",
    "Traveller",
  ],
  Renault: ["Espace", "Megane", "Modus", "Scenic", "Zoe"],
  Seat: ["Ibiza", "Leon", "Mii", "Exeo", "Altea"],
  Skoda: [
    "Citigo",
    "Fabia",
    "Karoq",
    "Kodiaq",
    "Octavia",
    "Rapid",
    "Roomster",
    "Superb",
    "Yeti",
  ],
  Smart: ["ForFour", "ForTwo"],
  Suzuki: ["Jimny", "Vitara", "Swift"],
  Tesla: [],
  Toyota: [
    "Auris",
    "Avensis",
    "Aygo",
    "Corolla",
    "Estima",
    "Highlander",
    "LandCruiser",
    "Prius",
    "Proace",
    "Yaris",
    "Verso",
  ],
  Vauxhall: [
    "Adam",
    "Astra",
    "Combo",
    "Corsa",
    "Crossland",
    "Grandland",
    "Insignia",
    "Mokka",
    "Viva",
    "Vivaro",
    "Zafira",
  ],
  Volkswagen: [
    "Arteon",
    "Caddy",
    "California",
    "Caravelle",
    "Golf",
    "Passat",
    "Polo",
    "T-Roc",
    "Tiguan",
    "UP!",
    "Touran",
    "Touareg",
    "Sharan",
  ],
  Volvo: ["S60", "S90", "V40", "V60", "V70", "V90", "XC40", "XC60", "XC90"],
};

interface SearchFormProps {
  onSubmit: (values: SearchFormValues) => void;
  isLoading?: boolean;
}

export default function SearchForm({
  onSubmit,
  isLoading = false,
}: SearchFormProps) {
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      make: "any_make",
      model: "any_model",
      color: "",
      vatQualifying: false,
      minYear: "any_min_year",
      maxYear: "any_max_year",
      minMileage: "",
      maxMileage: "",
      minPrice: "",
      maxPrice: "",
    },
  });

  const handleSubmit = (values: SearchFormValues) => {
    console.log("Form submitted with values:", values);
    console.log("Form errors:", form.formState.errors);

    // Convert "any" values to undefined for the API
    const processedValues = {
      ...values,
      make: values.make === "any_make" ? undefined : values.make,
      model: values.make === "any_make" ? undefined : values.model,
    };
    onSubmit(processedValues);
  };

  const handleReset = () => {
    form.reset({
      make: "any_make",
      model: "any_model",
      color: "",
      vatQualifying: false,
      minYear: "any_min_year",
      maxYear: "any_max_year",
      minMileage: "",
      maxMileage: "",
      minPrice: "",
      maxPrice: "",
    });
  };

  const selectedMake = form.watch("make");

  // Reset model value when make changes
  useEffect(() => {
    if (selectedMake && selectedMake !== "any_make") {
      form.setValue("model", "any_model");
    } else if (selectedMake === "any_make") {
      // If "Any make" is selected, force model to "Any model"
      form.setValue("model", "any_model");
    }
  }, [selectedMake, form]);

  // Generate select options for car models based on selected make
  const getCarModels = (make: string) => {
    if (!make || make === "any_make") {
      // If no make is selected or "Any make" is selected, return empty array
      return [];
    }
    return modelMap[make] || [];
  };

  const carModels = getCarModels(selectedMake);
  const isAnyMakeSelected = selectedMake === "any_make";

  // Watch all form values for changes
  const watchedValues = form.watch();

  // Check if any filters are set
  const hasActiveFilters = useMemo(() => {
    return (
      (watchedValues.make && watchedValues.make !== "any_make") ||
      (watchedValues.model && watchedValues.model !== "any_model") ||
      (watchedValues.color &&
        watchedValues.color !== "" &&
        watchedValues.color !== "any_color") ||
      watchedValues.vatQualifying === true ||
      (watchedValues.minYear && watchedValues.minYear !== "any_min_year") ||
      (watchedValues.maxYear && watchedValues.maxYear !== "any_max_year") ||
      (watchedValues.minMileage && watchedValues.minMileage.trim() !== "") ||
      (watchedValues.maxMileage && watchedValues.maxMileage.trim() !== "") ||
      (watchedValues.minPrice && watchedValues.minPrice.trim() !== "") ||
      (watchedValues.maxPrice && watchedValues.maxPrice.trim() !== "")
    );
  }, [watchedValues]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search Vehicles
        </CardTitle>
        <CardDescription>
          Search across multiple dealer websites for vehicles matching your
          criteria
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Make Field */}
              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value || "any_make"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select make (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="any_make">Any make</SelectItem>
                        {carMakes.map((make) => (
                          <SelectItem key={make} value={make}>
                            {make}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Model Field */}
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "any_model"}
                      disabled={isAnyMakeSelected}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select model (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="any_model">Any model</SelectItem>
                        {carModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {isAnyMakeSelected && (
                      <p className="text-sm text-muted-foreground">
                        Model selection is disabled when "Any make" is selected
                      </p>
                    )}
                  </FormItem>
                )}
              />

              {/* Color Field */}
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "any_color"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Any color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="any_color">Any color</SelectItem>
                        {[
                          "Black",
                          "White",
                          "Silver",
                          "Grey",
                          "Blue",
                          "Red",
                          "Green",
                          "Yellow",
                        ].map((color) => (
                          <SelectItem key={color} value={color.toLowerCase()}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* VAT Qualifying Checkbox */}
              <FormField
                control={form.control}
                name="vatQualifying"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        VAT Qualifying
                      </FormLabel>
                      <FormDescription>
                        Only show vehicles that are VAT qualifying.
                      </FormDescription>
                    </div>
                    <Checkbox
                      id="vatQualifying"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormItem>
                )}
              />

              {/* Year Range Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Year</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "any_min_year"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="any_min_year">Any</SelectItem>
                            {yearOptions.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Year</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "any_max_year"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Any" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="any_max_year">Any</SelectItem>
                            {yearOptions.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Mileage Range Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minMileage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Mileage</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxMileage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Mileage</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Price Range Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Price (£)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Price (£)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Any" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || !hasActiveFilters}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" /> Search Vehicles
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isLoading || !hasActiveFilters}
                className="px-3"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            {!hasActiveFilters && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                Please set at least one filter to search for vehicles
              </p>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
