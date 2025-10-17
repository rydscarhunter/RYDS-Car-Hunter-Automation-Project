// Disposal Network site config for Stagehand car search
// Requires: stagehand (for logging), loginWithObserve (for login helper)
// Imports types from index.ts
import type {
  SiteConfig,
  SearchParams,
  LoginCredentials,
} from "../../index.js";
import { Response } from "playwright";

/**
 * Disposal Network Site Configuration
 * This function returns a complete site configuration object for the Disposal Network car auction website
 * It handles authentication, basic filtering (make/model only), and data extraction via API responses
 * Disposal Network has limited filtering options compared to other sites
 */
export function disposalnetworkConfig(stagehand: any): SiteConfig {
  return {
    name: "disposalnetwork",
    baseUrl: "https://disposalnetwork.1link.co.uk",
    loginUrl: "https://disposalnetwork.1link.co.uk/uk/tb/app/login",
    shouldNavigateToSearchUrl: false,

    /**
     * LOGIN FUNCTION
     * Handles user authentication to the Disposal Network website
     * Simple login process with username/password fields and login button
     */
    login: async (page: any, credentials: LoginCredentials) => {
      try {
        // Navigate to the Disposal Network login page
        await page.goto("https://disposalnetwork.1link.co.uk/uk/tb/app/login");
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2_000);

        // Log the current URL to verify we're on the login page
        const currentUrl = page.url();
        stagehand.log({
          category: "debug",
          message: `Current URL: ${currentUrl}`,
        });

        // Fill in username and password fields
        await page.fill('input[placeholder="Username"]', credentials.username);
        await page.fill('input[placeholder="Password"]', credentials.password);

        // Click the login button to authenticate
        await page.getByRole("button", { name: "Login" }).click();
        await page.waitForTimeout(2000);

        // Log successful login completion
        stagehand.log({
          category: "debug",
          message: "Login completed successfully",
        });
      } catch (error) {
        // Log any login errors and re-throw for handling upstream
        stagehand.log({
          category: "error",
          message: `Login error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
        throw error;
      }
    },

    /**
     * APPLY FILTERS FUNCTION
     * Applies basic search filters to narrow down car results
     * Filtering options: make, model, color, price, age, mileage
     * Captures API responses for data extraction
     * Make and model are now optional - can search with just other filters
     */
    applyFilters: async (page: any, params: SearchParams) => {
      // STEP 1: Set up response listener to capture API calls
      const responses: Response[] = [];

      page.on("response", (resp: Response) => {
        const url = resp.url();
        const method = resp.request().method();
        const status = resp.status();

        // Capture the specific vehicle search API response
        if (
          (url.includes("/uk/micro/vehicles/Search") ||
            url.includes("/vehicles/Search") ||
            url.includes("/Search")) &&
          method === "POST" &&
          status === 200 &&
          !url.includes("filter") &&
          !url.includes("option")
        ) {
          responses.push(resp);
        }
      });

      // STEP 2: Click initial search button to load filter options
      await page.getByRole("button", { name: "Search" }).click();

      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // STEP 3: Apply Make filter (always open the make interface to initialize search)
      // This is necessary to initialize the search functionality, even when no specific make is selected
      await page.locator('label:has-text("Make")').click();
      await page.waitForLoadState("networkidle");
      await page.waitForSelector('div.checkbox input[type="checkbox"]');

      if (params.make && params.make.trim()) {
        // Find and select the make checkbox using the actual search parameters
        const makeLabel = await page.$(
          `label:has-text("${params.make.toUpperCase()}")`
        );
        if (makeLabel) {
          await makeLabel.check();
          await page.waitForTimeout(1000);
          // Mark that make filter was applied successfully
          (page as any)._disposalnetworkMakeApplied = true;
          stagehand.log({
            category: "debug",
            message: `Selected make: ${params.make}`,
          });
        } else {
          stagehand.log({
            category: "warn",
            message: `Make "${params.make.toUpperCase()}" not available in filter options. Skipping make filter gracefully.`,
          });
          // Mark that make filter was not applied
          (page as any)._disposalnetworkMakeApplied = false;
          // Early return - no point continuing with other filters if make is not available
          return;
        }
      } else {
        console.log(
          "ℹ️ [DisposalNetwork] No make specified - will search all makes (make interface opened but no specific make selected)"
        );
        (page as any)._disposalnetworkMakeApplied = true; // Allow all makes
      }

      // STEP 4: Apply Model filter (optional, but requires make)
      if (
        params.make &&
        params.make.trim() &&
        params.model &&
        params.model.trim()
      ) {
        await page.locator('label:has-text("Range")').click();
        await page.waitForLoadState("networkidle");
        await page.waitForSelector(".rangeGroup__checkboxes .checkbox");

        // Find and select the model checkbox using the actual search parameters
        const modelLabels = await page.$$(
          `label:has-text("${params.model.toUpperCase()}")`
        );
        if (modelLabels.length > 0) {
          // Select all matching model variations
          for (const label of modelLabels) {
            await label.check();
          }
          await page.waitForTimeout(1000);
          // Mark that model filter was applied successfully
          (page as any)._disposalnetworkModelApplied = true;
          stagehand.log({
            category: "debug",
            message: `Selected ${modelLabels.length} model variations for: ${params.model}`,
          });
        } else {
          stagehand.log({
            category: "warn",
            message: `Model \"${params.model.toUpperCase()}\" not available in filter options. Skipping model filter gracefully.`,
          });
          // Mark that model filter was not applied
          (page as any)._disposalnetworkModelApplied = false;
          // Early return - no point continuing with other filters if model is not available
          return;
        }
      } else if (params.make && params.make.trim()) {
        console.log(
          "ℹ️ [DisposalNetwork] No model specified - will search all models for selected make"
        );
        (page as any)._disposalnetworkModelApplied = true; // Allow all models for selected make
      } else {
        console.log(
          "ℹ️ [DisposalNetwork] No make specified - will search all models"
        );
        (page as any)._disposalnetworkModelApplied = true; // Allow all models
      }

      await page.waitForTimeout(1000);

      // STEP 4.5: Apply Mileage filter using UI radio buttons (if maxMileage is specified)
      if (params.maxMileage !== undefined) {
        try {
          console.log(
            `[DisposalNetwork] Applying mileage filter for maxMileage: ${params.maxMileage}`
          );

          // Click the odometer accordion header to open the mileage options
          console.log(`[DisposalNetwork] Clicking Odometer accordion header`);
          await page.click(
            '.accordion__header-label label:has-text("Odometer")'
          );
          await page.waitForTimeout(2000);

          // Check if accordion content is visible
          const accordionContent = await page.$(".accordion__content");
          if (accordionContent) {
            const isVisible = await accordionContent.isVisible();
            console.log(
              `[DisposalNetwork] Accordion content visible: ${isVisible}`
            );
          } else {
            console.log(`[DisposalNetwork] Accordion content not found`);
          }

          // Wait for radio buttons to appear (don't require them to be visible, just present)
          await page.waitForSelector('.radio-input__input[type="radio"]', {
            state: "attached",
            timeout: 10000,
          });

          // Get all available mileage options
          const availableOptions = await page.$$eval(
            '.radio-input__input[type="radio"]',
            (elements: any[]) =>
              elements.map((el: any) => ({
                text: el.getAttribute("name"),
                value: parseInt(el.getAttribute("value")),
                isDisabled:
                  el.disabled || el.getAttribute("aria-disabled") === "true",
              }))
          );

          console.log(
            `[DisposalNetwork] Available mileage options:`,
            availableOptions
          );

          // Filter to only enabled options
          const enabledOptions = availableOptions.filter(
            (opt: any) => !opt.isDisabled
          );

          if (enabledOptions.length === 0) {
            console.log(
              "[DisposalNetwork] No enabled mileage options available"
            );
          } else {
            // Define mileage ranges in order of preference
            const mileageRanges = [
              { max: 10000, text: "Up to 10,000" },
              { max: 20000, text: "Up to 20,000" },
              { max: 30000, text: "Up to 30,000" },
              { max: 40000, text: "Up to 40,000" },
              { max: 50000, text: "Up to 50,000" },
              { max: 60000, text: "Up to 60,000" },
              { max: 70000, text: "Up to 70,000" },
              { max: 80000, text: "Up to 80,000" },
              { max: 90000, text: "Up to 90,000" },
              { max: 100000, text: "Up to 100,000" },
            ];

            // Find the target range - look for the smallest range that includes our maxMileage
            console.log(
              `[DisposalNetwork] Looking for mileage range that covers: ${params.maxMileage}`
            );
            const targetRange = mileageRanges.find(
              (range) => params.maxMileage! <= range.max
            );
            console.log(`[DisposalNetwork] Target range found:`, targetRange);

            if (targetRange) {
              // Check if target option is available and enabled
              console.log(
                `[DisposalNetwork] Looking for target option: "${targetRange.text}"`
              );
              const targetOption = enabledOptions.find(
                (opt: any) => opt.text === targetRange.text
              );
              console.log(
                `[DisposalNetwork] Target option found:`,
                targetOption
              );
              if (targetOption) {
                // Try clicking the label instead of the radio button (labels are usually more reliable)
                await page.click(`label:has-text("${targetRange.text}")`);
                console.log(
                  `[DisposalNetwork] Selected mileage filter: ${targetRange.text} for maxMileage: ${params.maxMileage}`
                );
              } else {
                // If target option doesn't exist, find the next available option that covers our mileage
                const targetIndex = mileageRanges.indexOf(targetRange);
                let selectedOption = null;

                // Look for the next available option that covers our mileage requirement
                for (let i = targetIndex; i < mileageRanges.length; i++) {
                  const fallbackRange = mileageRanges[i];
                  const fallbackOption = enabledOptions.find(
                    (opt: any) => opt.text === fallbackRange.text
                  );
                  if (fallbackOption) {
                    await page.click(`label:has-text("${fallbackRange.text}")`);
                    selectedOption = fallbackRange.text;
                    console.log(
                      `[DisposalNetwork] Selected fallback mileage filter: ${fallbackRange.text} for maxMileage: ${params.maxMileage} (target was ${targetRange.text})`
                    );
                    break;
                  }
                }

                if (!selectedOption) {
                  // If no suitable option found, there are no cars matching the criteria
                  console.log(
                    `[DisposalNetwork] No cars available for maxMileage: ${params.maxMileage} (no suitable mileage options available)`
                  );
                  console.log(
                    `[DisposalNetwork] Available mileage options: ${enabledOptions
                      .map((opt: any) => opt.text)
                      .join(", ")}`
                  );

                  // Mark that no results should be expected
                  (page as any)._disposalnetworkNoResults = true;
                  return; // Exit the filtering logic
                }
              }
            } else {
              // If no range covers our mileage (e.g., maxMileage > 100,000), check if "100,000 +" is available
              const unlimitedOption = enabledOptions.find(
                (opt: any) => opt.text === "100,000 +"
              );
              if (unlimitedOption) {
                await page.click(`label:has-text("100,000 +")`);
                console.log(
                  `[DisposalNetwork] Selected unlimited mileage filter for maxMileage: ${params.maxMileage}`
                );
              } else {
                console.log(
                  `[DisposalNetwork] No cars available for maxMileage: ${params.maxMileage} (no suitable mileage options available)`
                );
                console.log(
                  `[DisposalNetwork] Available mileage options: ${enabledOptions
                    .map((opt: any) => opt.text)
                    .join(", ")}`
                );

                // Mark that no results should be expected
                (page as any)._disposalnetworkNoResults = true;
                return; // Exit the filtering logic
              }
            }
          }

          await page.waitForTimeout(1000);
        } catch (error) {
          console.log(
            `[DisposalNetwork] Error applying mileage filter: ${error}`
          );
        }
      }

      // STEP 5: Execute search with selected filters
      await page
        .locator(".primary-filter__search button", { hasText: "Search" })
        .click();

      await page.waitForLoadState("domcontentloaded");

      // Give extra time for API calls to complete
      await page.waitForTimeout(3000);

      // STEP 5.1: Apply UI filters (Price and Age) if specified
      if (params.maxPrice !== undefined || params.maxAge !== undefined) {
        try {
          // Click the filter tab to open the filter section (only once)
          await page.click('button[data-active="false"]:has-text("Filter")');
          await page.waitForTimeout(1000);

          // Helper function to select dropdown option
          const selectDropdownOption = async (optionText: string) => {
            await page.click(`.dropdown__option:has-text("${optionText}")`);
            await page.waitForTimeout(500);
          };

          // Helper function to get available dropdown options
          const getAvailableOptions = async () => {
            const availableOptions = await page.$$eval(
              ".dropdown__option",
              (elements: any[]) =>
                elements.map((el: any) => ({
                  text: el
                    .querySelector(".dropdown__option-name")
                    ?.textContent?.trim(),
                  isDisabled:
                    el.classList.contains("disabled") ||
                    el.getAttribute("aria-disabled") === "true" ||
                    el.style.opacity === "0.5",
                }))
            );
            return availableOptions.filter((opt: any) => !opt.isDisabled);
          };

          // Helper function to open dropdown and wait for options
          const openDropdownAndWait = async () => {
            await page.click(".dropdown__trigger");
            await page.waitForTimeout(2000);

            // Wait for dropdown options to appear and be populated
            await page.waitForSelector(".dropdown__container");

            // Wait for the dropdown to be fully expanded
            await page.waitForFunction(
              () => {
                const trigger = document.querySelector(".dropdown__trigger");
                return (
                  trigger && trigger.getAttribute("aria-expanded") === "true"
                );
              },
              { timeout: 5000 }
            );

            // Wait a bit more for the options to actually load
            await page.waitForTimeout(1000);

            // Check if options are actually present
            const optionCount = await page.$$eval(
              ".dropdown__option",
              (elements: any[]) => elements.length
            );

            if (optionCount === 0) {
              console.log(
                "[DisposalNetwork] No dropdown options found, waiting longer..."
              );
              await page.waitForTimeout(3000);

              // Try clicking the dropdown trigger again
              await page.click(".dropdown__trigger");
              await page.waitForTimeout(2000);
            }
          };

          // Apply Price filter if specified
          if (params.maxPrice !== undefined) {
            console.log(
              `[DisposalNetwork] Applying price filter for maxPrice: ${params.maxPrice}`
            );

            // Click the price accordion header to open the price dropdown
            await page.click(
              '.accordion__header-label label:has-text("Price")'
            );
            await page.waitForTimeout(1000);

            // Wait for the dropdown to appear
            await page.waitForSelector(".dropdown__trigger");

            await openDropdownAndWait();

            const enabledOptions = await getAvailableOptions();

            if (enabledOptions.length === 0) {
              console.log(
                "[DisposalNetwork] No enabled price options available"
              );
            } else {
              console.log(
                `[DisposalNetwork] Available price options:`,
                enabledOptions
              );

              // Define price ranges in order of preference
              const priceRanges = [
                { max: 2500, text: "Up to £2,500" },
                { max: 5000, text: "Up to £5,000" },
                { max: 10000, text: "Up to £10,000" },
                { max: 15000, text: "Up to £15,000" },
                { max: 20000, text: "Up to £20,000" },
                { max: 30000, text: "Up to £30,000" },
                { max: 50000, text: "Up to £50,000" },
              ];

              // Find the target range
              const targetRange = priceRanges.find(
                (range) => params.maxPrice! <= range.max
              );

              let selectedOption = null;

              if (targetRange) {
                // Check if target option is available and enabled
                const targetOption = enabledOptions.find(
                  (opt: any) => opt.text === targetRange.text
                );
                if (targetOption) {
                  await selectDropdownOption(targetRange.text);
                  selectedOption = targetRange.text;
                  console.log(
                    `[DisposalNetwork] Selected price filter: ${targetRange.text}`
                  );
                } else {
                  // If target price option doesn't exist, there are no cars matching the criteria
                  console.log(
                    `[DisposalNetwork] No cars available for maxPrice: ${params.maxPrice} (target option "${targetRange.text}" not available)`
                  );
                  console.log(
                    `[DisposalNetwork] Available price options: ${enabledOptions
                      .map((opt: any) => opt.text)
                      .join(", ")}`
                  );

                  // Close the filter section and return 0 results
                  await page.click(
                    'button[data-active="true"]:has-text("Filter")'
                  );
                  await page.waitForTimeout(1000);

                  // Mark that no results should be expected
                  (page as any)._disposalnetworkNoResults = true;
                  return; // Exit the filtering logic
                }
              }
            }
          }

          // Apply Age filter if specified
          if (params.maxAge !== undefined) {
            console.log(
              `[DisposalNetwork] Applying age filter for maxAge: ${params.maxAge}`
            );

            // Click the age accordion header to open the age dropdown
            await page.click('.accordion__header-label label:has-text("Age")');
            await page.waitForTimeout(1000);

            // Wait for the dropdown to appear
            await page.waitForSelector(".dropdown__trigger");

            await openDropdownAndWait();

            const enabledOptions = await getAvailableOptions();

            if (enabledOptions.length === 0) {
              console.log("[DisposalNetwork] No enabled age options available");
            } else {
              console.log(
                `[DisposalNetwork] Available age options:`,
                enabledOptions
              );

              // Define age ranges in order of preference
              const ageRanges = [
                { max: 1, text: "Up to 1 year" },
                { max: 2, text: "Up to 2 years" },
                { max: 3, text: "Up to 3 years" },
                { max: 4, text: "Up to 4 years" },
                { max: 5, text: "Up to 5 years" },
              ];

              // Find the target range
              const targetRange = ageRanges.find(
                (range) => params.maxAge! <= range.max
              );

              let selectedOption = null;

              if (targetRange) {
                // Check if target option is available and enabled
                const targetOption = enabledOptions.find(
                  (opt: any) => opt.text === targetRange.text
                );
                if (targetOption) {
                  await selectDropdownOption(targetRange.text);
                  selectedOption = targetRange.text;
                  console.log(
                    `[DisposalNetwork] Selected age filter: ${targetRange.text}`
                  );
                } else {
                  // If target age option doesn't exist, there are no cars matching the criteria
                  console.log(
                    `[DisposalNetwork] No cars available for maxAge: ${params.maxAge} (target option "${targetRange.text}" not available)`
                  );
                  console.log(
                    `[DisposalNetwork] Available age options: ${enabledOptions
                      .map((opt: any) => opt.text)
                      .join(", ")}`
                  );

                  // Close the filter section and return 0 results
                  await page.click(
                    'button[data-active="true"]:has-text("Filter")'
                  );
                  await page.waitForTimeout(1000);

                  // Mark that no results should be expected
                  (page as any)._disposalnetworkNoResults = true;
                  return; // Exit the filtering logic
                }
              }
            }
          }

          // Close the filter section by clicking the filter button again
          await page.click('button[data-active="true"]:has-text("Filter")');
          await page.waitForTimeout(1000);
        } catch (error) {
          console.log(`[DisposalNetwork] Error applying UI filters: ${error}`);
        }
      }

      // STEP 5.5: Add a more specific response listener for the final search
      const finalSearchResponses: Response[] = [];
      const finalSearchListener = (resp: Response) => {
        const url = resp.url();
        const method = resp.request().method();
        const status = resp.status();

        // Look for the actual vehicle search results API call
        if (
          method === "POST" &&
          status === 200 &&
          (url.includes("/vehicles") || url.includes("/search")) &&
          !url.includes("filter") &&
          !url.includes("option") &&
          !url.includes("make") &&
          !url.includes("model")
        ) {
          finalSearchResponses.push(resp);
        }
      };

      page.on("response", finalSearchListener);
      await page.waitForTimeout(2000);
      page.off("response", finalSearchListener);

      // If we captured a final search response, use it instead
      if (finalSearchResponses.length > 0) {
        responses.push(...finalSearchResponses);
      }

      // STEP 6: Apply Color filter (optional, if color parameter is provided)
      if (params.color && params.color.trim()) {
        await page.click('button[data-active="false"]:has-text("Filter")');
        await page.waitForTimeout(1000);
        await page.click('.accordion__header-label label:has-text("Colour")');

        // Capitalize the first letter of params.color to match the label/case in the DOM
        const color =
          (params.color.charAt(0).toUpperCase() ?? "") +
          (params.color.slice(1).toLowerCase() ?? "");

        // Try to find and select the color label
        const colorLabel = await page.$(
          `label.checkbox__label:text-is("${color}")`
        );
        if (colorLabel) {
          await colorLabel.click();
          await page.waitForTimeout(1000);
        } else {
          stagehand.log({
            category: "warn",
            message: `Color "${color}" not available in filter options, skipping color filter.`,
          });
        }

        // Close the filter panel
        await page.click('button.sc-ifAKCX.jWFgEz:has-text("Close")');

        // Wait for any final API calls after color filter
        await page.waitForTimeout(2000);
      }

      // STEP 7: Verify API response was captured and store for extraction
      // After all filter actions and waits

      if (responses.length === 0) {
        throw new Error(
          "No matching API response found for vehicle search. Expected '/uk/micro/vehicles/Search' POST request."
        );
      }

      (page as any)._lastDisposalNetworkResponse =
        responses[responses.length - 1];

      // Wait a bit more for results to fully load
      await page.waitForTimeout(3000);
    },

    /**
     * EXTRACT CARS FUNCTION
     * Extracts car data from the API response captured during filtering
     * Handles pagination for the first 3 pages to get up to 75 results
     * No additional filtering needed - all filtering is handled in the UI
     * Returns standardized car objects with all relevant information
     */
    extractCars: async (page: any, params?: SearchParams) => {
      // STEP 1: Check if no results should be expected (due to unavailable filter options)
      if ((page as any)._disposalnetworkNoResults === true) {
        console.log(
          "⚠️ [DisposalNetwork] No results expected due to unavailable filter options. Returning 0 results."
        );
        return [];
      }

      // STEP 2: Verify that required filters were applied successfully
      // Check if make filter was applied (might have failed)
      if ((page as any)._disposalnetworkMakeApplied === false) {
        console.log(
          "⚠️ [DisposalNetwork] Make filter was not applied due to unavailable make. Returning 0 results gracefully."
        );
        return [];
      }

      // Check if model filter was applied (might have failed)
      if ((page as any)._disposalnetworkModelApplied === false) {
        console.log(
          "⚠️ [DisposalNetwork] Model filter was not applied due to unavailable model. Returning 0 results gracefully."
        );
        return [];
      }

      // STEP 3: Set up response listener for pagination
      const allResponses: Response[] = [];
      const paginationListener = (resp: Response) => {
        const url = resp.url();
        const method = resp.request().method();
        const status = resp.status();

        // Capture vehicle search API responses for pagination
        if (
          (url.includes("/uk/micro/vehicles/Search") ||
            url.includes("/vehicles/Search") ||
            url.includes("/Search")) &&
          method === "POST" &&
          status === 200 &&
          !url.includes("filter") &&
          !url.includes("option")
        ) {
          allResponses.push(resp);
        }
      };

      page.on("response", paginationListener);

      // STEP 4: Extract data from all pages (up to 3 pages)
      const allCarData: any[] = [];
      const maxPages = 3;

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          console.log(`[DisposalNetwork] Processing page ${pageNum}...`);

          // For the first page, use the existing response
          if (pageNum === 1) {
            const lastResponse = (page as any)._lastDisposalNetworkResponse;
            if (!lastResponse) {
              throw new Error(
                "No matching API response found for vehicle search."
              );
            }
            allResponses.push(lastResponse);
          } else {
            // For subsequent pages, click the next page button
            console.log(
              `[DisposalNetwork] Clicking next page button for page ${pageNum}...`
            );

            // Wait for pagination to be visible
            await page.waitForSelector(".sc-giadOv.cEmJgy", { timeout: 10000 });

            // Click the next page button
            const nextPageButton = await page.$(
              `button[value="${pageNum}"]:has-text("${pageNum}")`
            );
            if (nextPageButton) {
              await nextPageButton.click();
              await page.waitForLoadState("networkidle");
              await page.waitForTimeout(2000);
            } else {
              console.log(
                `[DisposalNetwork] No next page button found for page ${pageNum}. Stopping pagination.`
              );
              break;
            }
          }

          // Get the latest response for this page
          const latestResponse = allResponses[allResponses.length - 1];
          if (!latestResponse) {
            console.log(
              `[DisposalNetwork] No response found for page ${pageNum}. Skipping.`
            );
            continue;
          }

          const data = await latestResponse.json();
          console.log(
            `[DisposalNetwork] Page ${pageNum} API response: ${
              data.vehicles?.length || 0
            } vehicles found`
          );

          // Check if the response has the expected structure
          if (!data || typeof data !== "object") {
            console.log(
              `[DisposalNetwork] Invalid API response for page ${pageNum}. Skipping.`
            );
            continue;
          }

          // Check if vehicles array exists
          if (!data.vehicles || !Array.isArray(data.vehicles)) {
            console.log(
              `[DisposalNetwork] No vehicles array in page ${pageNum} response. Skipping.`
            );
            continue;
          }

          // Add vehicles from this page to the total
          allCarData.push(...data.vehicles);
          console.log(
            `[DisposalNetwork] Page ${pageNum}: ${data.vehicles.length} vehicles added. Total so far: ${allCarData.length}`
          );

          // If this page has fewer than 25 vehicles, we've reached the end
          if (data.vehicles.length < 25) {
            console.log(
              `[DisposalNetwork] Page ${pageNum} has fewer than 25 vehicles. Reached end of results.`
            );
            break;
          }
        } catch (error) {
          console.log(
            `[DisposalNetwork] Error processing page ${pageNum}: ${error}`
          );
          break;
        }
      }

      // Remove the pagination listener
      page.off("response", paginationListener);

      console.log(
        `[DisposalNetwork] Total vehicles collected from all pages: ${allCarData.length}`
      );

      // STEP 5: Transform all collected data into standardized car objects
      const finalCarData = allCarData
        .map((vehicle: any) => {
          try {
            return {
              url: `https://disposalnetwork.1link.co.uk/uk/tb/app/vehicle/${
                vehicle.vehicleId || "unknown"
              }`,
              imageUrl: vehicle.thumbnail || "",
              title: `${vehicle.make || "Unknown"} ${
                vehicle.model || "Unknown"
              } ${vehicle.derivative || ""}`.trim(),
              price: vehicle.buyNowPrice || 0,
              location: vehicle.vehicleLocationPostCode || "",
              registration: vehicle.regNo || "",
              mileage: vehicle.mileage || 0,
              source: "DisposalNetwork",
              timestamp: new Date().toISOString(),
            };
          } catch (error) {
            console.log(
              `[DisposalNetwork] Error transforming vehicle:`,
              error,
              vehicle
            );
            return null;
          }
        })
        .filter((car: any) => car !== null);

      console.log(
        `[DisposalNetwork] Final processed results: ${finalCarData.length} vehicles`
      );

      // Return the processed and filtered car data
      return finalCarData;
    },
  };
}
