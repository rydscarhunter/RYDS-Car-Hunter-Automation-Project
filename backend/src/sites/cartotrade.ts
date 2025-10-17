// CarToTrade site config for Stagehand car search
import type {
  SiteConfig,
  SearchParams,
  LoginCredentials,
} from "../../index.js";

/**
 * CarToTrade Site Configuration
 * This function returns a complete site configuration object for the CarToTrade car dealership website
 * It handles authentication, filtering using noUiSlider components, and data extraction
 * CarToTrade uses a unique filtering system with sliders and dropdowns
 */
export function cartotradeConfig(stagehand: any): SiteConfig {
  return {
    name: "CarToTrade",
    baseUrl: "https://www.cartotrade.co.uk",
    loginUrl:
      "https://www.cartotrade.com/Account/Login?ReturnUrl=%2FHome%2FVehiclesOffered",
    shouldNavigateToSearchUrl: false,

    /**
     * LOGIN FUNCTION
     * Handles user authentication to the CarToTrade website
     * Navigates to login page, fills credentials, and completes the login process
     * Includes a post-login step to select a specific user account
     */
    login: async (page: any, credentials: LoginCredentials) => {
      try {
        // Navigate to the CarToTrade login page
        await page.goto(
          "https://www.cartotrade.com/Account/Login?ReturnUrl=%2FHome%2FVehiclesOffered"
        );
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2_000);

        // Log current URL for debugging purposes
        const currentUrl = page.url();
        stagehand.log({
          category: "debug",
          message: `Current URL: ${currentUrl}`,
        });

        // Fill in username and password fields
        await page.fill("#Username", credentials.username);
        await page.fill("#Password", credentials.password);

        // Click the login button to authenticate
        await page.click('button:has-text("Login")');

        // Wait for login to complete and page to load
        await page.waitForLoadState("networkidle");

        // Post-login step: Select specific user account (Ian Grosskopf)
        // This appears to be a required step for this particular CarToTrade setup
        await page.click('a.user-select:has-text("Ian Grosskopf")');
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
     * Applies search filters to narrow down car results based on user parameters
     * Uses CarToTrade's noUiSlider components for price, mileage, and age ranges
     * Handles make selection via checkboxes and model selection via dropdowns
     */
    applyFilters: async (page: any, params: SearchParams) => {
      // Only log make/model if they're provided
      const makeModelText =
        params.make && params.model
          ? `${params.make} ${params.model}`
          : params.make || params.model || "No make/model specified";

      stagehand.log({
        category: "debug",
        message: `Starting filter application for ${makeModelText}`,
      });

      // STEP 1: Apply Make filter using checkbox selection (only if make is provided)
      if (params.make && params.make.trim()) {
        const make = params.make.toUpperCase();

        // Find the checkbox corresponding to the make
        const checkbox = page.locator(
          `xpath=//input[@type="hidden" and contains(@id, "capMan_name") and contains(@value, "${make}")]/parent::li//input[@type="checkbox"]`
        );

        // Click the checkbox to select the make
        await checkbox.check();
        await page.waitForTimeout(1000);
      } else {
        console.log("⚠️ [CartoTrade] No make specified, skipping make filter");
      }

      // STEP 2: Apply Price range filter using noUiSlider
      const sliderSelector = "#range-noui-slider-price";

      const minPrice = params.minPrice || 0;
      const maxPrice = params.maxPrice || 100000;

      // Use JavaScript evaluation to interact with the noUiSlider component
      // noUiSlider is a third-party library that provides range slider functionality
      await page.evaluate(
        ({
          selector,
          minPrice,
          maxPrice,
        }: {
          selector: any;
          minPrice: number;
          maxPrice: number;
        }) => {
          const el = document.querySelector(selector);
          if (el && el.noUiSlider) {
            el.noUiSlider.set([minPrice, maxPrice]);
          } else {
            console.error("noUiSlider API not found on", selector);
          }
        },
        { selector: sliderSelector, minPrice, maxPrice } // pass as a single object
      );

      // STEP 3: Apply Mileage range filter using noUiSlider
      const mileageSliderSelector = "#range-noui-slider-mileage";

      const minMileage = params.minMileage || 0;
      const maxMileage = params.maxMileage || 100000;

      await page.evaluate(
        ({
          selector,
          minMileage,
          maxMileage,
        }: {
          selector: any;
          minMileage: number;
          maxMileage: number;
        }) => {
          const el = document.querySelector(selector);
          if (el && el.noUiSlider) {
            el.noUiSlider.set([minMileage, maxMileage]);
          } else {
            console.error("noUiSlider API not found on", selector);
          }
        },
        { selector: mileageSliderSelector, minMileage, maxMileage } // pass as a single object
      );

      // STEP 4: Apply Age range filter using noUiSlider
      const ageSliderSelector = "#range-noui-slider-age";

      const minAge = params.minAge || 0;
      const maxAge = params.maxAge || 25;

      await page.evaluate(
        ({
          selector,
          minAge,
          maxAge,
        }: {
          selector: any;
          minAge: number;
          maxAge: number;
        }) => {
          const el = document.querySelector(selector);
          if (el && el.noUiSlider) {
            el.noUiSlider.set([minAge, maxAge]);
          } else {
            console.error("noUiSlider API not found on", selector);
          }
        },
        { selector: ageSliderSelector, minAge, maxAge } // pass as a single object
      );

      // STEP 5: Execute initial search with basic filters
      await page.click('button:has-text("Search")');

      await page.waitForTimeout(3000);
      await page.waitForLoadState("domcontentloaded");

      // STEP 6: Apply advanced filters (model and color) if specified
      // Only apply model filter if a model was provided and is not empty
      if (params.model && params.model.trim()) {
        // Open the refine panel for additional filtering options
        await page.click("#toggleRefine");

        // Apply model filter if specified
        // Open the vehicle range dropdown
        await page.click("#vehicleRangeId");

        await page.waitForTimeout(500);

        // Get all options from the select dropdown
        const options = await page.$$eval(
          "#vehicleRangeId option",
          (opts: any) =>
            opts.map((opt: any) => ({
              value: opt.value,
              text: opt.textContent?.trim(),
            }))
        );

        // Find the option whose text includes the model name (case-insensitive)
        // This allows for partial matching of model names
        const match = options.find(
          (opt: { value: string; text?: string | null }) =>
            opt.text &&
            params.model &&
            opt.text.toUpperCase().includes(params.model.toUpperCase())
        );

        if (match) {
          // Select the matching model option
          await page.selectOption("#vehicleRangeId", { value: match.value });

          await page.waitForTimeout(1000);

          // Execute the refined search with additional filters
          await page
            .locator("button.btnSubmit.radius.expand", { hasText: "Search" })
            .nth(0)
            .click();

          console.log(`Applied model filter: ${params.model}`);
        } else {
          console.log(
            `⚠️ [CartoTrade] Model "${params.model}" not available in filter options. Will return 0 results.`
          );
          // Mark that search was not executed so extraction returns 0 results
          (page as any)._cartotradeSearchExecuted = false;
          return;
        }
      } else {
        console.log(
          "⚠️ [CartoTrade] No model specified, skipping model filter"
        );
      }

      // Mark that search was executed successfully
      (page as any)._cartotradeSearchExecuted = true;

      // Log the final URL after filtering for debugging
      const currentUrl = page.url();
      stagehand.log({
        category: "debug",
        message: `Current URL after filtering: ${currentUrl}`,
      });
    },

    /**
     * EXTRACT CARS FUNCTION
     * Extracts car data from the filtered search results page
     * Parses individual car cards to extract details like price, title, location, etc.
     * Handles cases where model filters may not have been applied successfully
     * Now includes pagination handling to collect results from all pages
     */
    extractCars: async (page: any) => {
      stagehand.log({
        category: "debug",
        message: "Starting manual extraction process with pagination handling",
      });

      // Check if search was executed (model filter might have failed)
      // If not, return empty array gracefully instead of failing
      if ((page as any)._cartotradeSearchExecuted === false) {
        console.log(
          "⚠️ [CartoTrade] Search was not executed due to unavailable model. Returning 0 results gracefully."
        );
        return [];
      }

      const allCarData = [];
      let currentPage = 0;
      let hasMorePages = true;

      // Loop through all pages to collect results
      while (hasMorePages) {
        console.log(`📄 [CartoTrade] Processing page ${currentPage + 1}`);

        // Wait for page to load
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(2000);

        // Find all car listing cards on the current page
        const cards = await page.$$(".panel");
        console.log(
          `🔍 [CartoTrade] Found ${cards.length} cars on page ${
            currentPage + 1
          }`
        );

        // Iterate through each car card and extract relevant information
        for (const card of cards) {
          try {
            // Check for the required anchor before extracting
            // Skip cards that don't have the expected structure
            const linkHandle = await card.$("h2.title a");
            if (!linkHandle) {
              console.warn("Skipping card: no h2.title a found");
              continue;
            }

            // Extract car URL from the card link
            const urlRaw = await card.$eval("h2.title a", (a: any) =>
              a.getAttribute("href")
            );
            const url = urlRaw ? urlRaw.trim() : urlRaw;

            // Extract car image URL with fallback handling
            // CarToTrade sometimes shows "no images yet" message instead of actual images
            const imageUrl = await card.evaluate((card: any) => {
              const img = card.querySelector("img");
              const noImages = card.querySelector("h1[style*='color: white;']");

              if (img) {
                return img.getAttribute("src")?.trim() || "";
              } else if (
                noImages &&
                noImages.textContent?.trim() === "no images yet"
              ) {
                return ""; // Return empty string when no images are available
              }
              return "";
            });

            // Extract car title/name
            const title = await card.$eval(
              "h2.title a",
              (el: any) => el.textContent?.trim().replace(/\s+/g, " ") || ""
            );

            // Extract car price with fallback handling
            // CarToTrade has different price element structures
            let price = await card
              .$eval(".column.medium-2 span.bold", (el: any) =>
                el.textContent?.trim()
              )
              .catch(async () => {
                return await card
                  .$eval(".column.medium-2", (el: any) =>
                    el.textContent?.trim()
                  )
                  .catch(() => "");
              });

            // Extract dealer location
            const location = await card
              .$eval("dd.bold span", (el: any) => el.textContent?.trim())
              .catch(() => "");

            // Extract registration number from hidden input field
            const reg = await card
              .$eval('input[name="vrmReg"]', (el: any) =>
                el.getAttribute("value")
              )
              .catch(() => "");

            // Extract mileage from the inline list (looks for text ending with "miles")
            const mileage = await card
              .$eval(
                ".inline-list.no-space-below.strong.lowercase.pipe-seperated.pull-left li:has-text('miles')",
                (el: any) => el.textContent?.trim() || ""
              )
              .catch(() => "");

            // Create standardized car object and add to results array
            allCarData.push({
              url: url?.startsWith("/")
                ? `https://www.cartotrade.com${url}`
                : url,
              imageUrl,
              title,
              price: price,
              location,
              registration: reg,
              mileage,
              source: "CarToTrade",
              timestamp: new Date().toISOString(),
            });
          } catch (err) {
            // Log warning and continue with next card if extraction fails for one
            console.warn(
              "Skipping a card due to missing or malformed elements:",
              err
            );
          }
        }

        // Check if there are more pages
        try {
          console.log(
            `🔍 [CartoTrade] Checking for pagination on page ${
              currentPage + 1
            }...`
          );

          // Wait a bit for any dynamic content to load
          await page.waitForTimeout(1000);

          // Try multiple pagination detection strategies
          let hasNextPage = false;
          let nextButton = null;

          // Strategy 1: Look for the specific pagination container
          const paginationContainer = await page.$("div.column.text-center");
          if (paginationContainer) {
            console.log("✅ [CartoTrade] Found pagination container");

            // Look for Next button with data-pagination-next attribute
            nextButton = await paginationContainer.$(
              "button[data-pagination-next]"
            );
            if (nextButton) {
              console.log(
                "✅ [CartoTrade] Found Next button with data-pagination-next"
              );
              hasNextPage = true;
            }
          }

          // Strategy 2: If Strategy 1 failed, try to find any button with "Next" text
          if (!nextButton) {
            console.log(
              "🔍 [CartoTrade] Trying alternative Next button detection..."
            );
            const allButtons = await page.$$("button");

            for (const button of allButtons) {
              try {
                const buttonText = await button.textContent();
                if (buttonText && buttonText.toLowerCase().includes("next")) {
                  console.log(
                    `✅ [CartoTrade] Found Next button with text: "${buttonText}"`
                  );
                  nextButton = button;
                  hasNextPage = true;
                  break;
                }
              } catch (e) {
                // Continue to next button
              }
            }
          }

          // Strategy 3: Check if there are numbered page buttons beyond current page
          if (!nextButton) {
            console.log(
              "🔍 [CartoTrade] Checking for numbered page buttons..."
            );
            const pageButtons = await page.$$(
              "button.btnlink[data-pagination-page]"
            );

            if (pageButtons.length > 0) {
              // Check if there's a page number higher than current page
              for (const pageButton of pageButtons) {
                try {
                  const pageNum = await pageButton.getAttribute(
                    "data-pagination-page"
                  );
                  if (pageNum && parseInt(pageNum) > currentPage) {
                    console.log(
                      `✅ [CartoTrade] Found page button for page ${
                        parseInt(pageNum) + 1
                      }`
                    );
                    nextButton = pageButton;
                    hasNextPage = true;
                    break;
                  }
                } catch (e) {
                  // Continue to next button
                }
              }
            }
          }

          // Strategy 4: Check if Next button is available and enabled
          if (!nextButton) {
            console.log("🔍 [CartoTrade] Checking Next button availability...");
            const nextButtons = await page.$$("button[data-pagination-next]");

            if (nextButtons.length > 0) {
              const nextBtn = nextButtons[0];
              if (await nextBtn.isVisible()) {
                // Check if this is the last page by looking at the current page indicator
                const currentPageButton = await page.$(
                  'button.btnlink[style*="font-weight:bold"]'
                );
                if (currentPageButton) {
                  const currentPageNum = await currentPageButton.getAttribute(
                    "data-pagination-page"
                  );
                  const totalPages = await page.$$(
                    "button.btnlink[data-pagination-page]"
                  );

                  if (currentPageNum && totalPages.length > 0) {
                    const current = parseInt(currentPageNum);
                    const total = totalPages.length;

                    if (current < total - 1) {
                      console.log(
                        `✅ [CartoTrade] Current page ${
                          current + 1
                        } of ${total}, Next button available`
                      );
                      nextButton = nextBtn;
                      hasNextPage = true;
                    } else {
                      console.log(
                        `🏁 [CartoTrade] Current page ${
                          current + 1
                        } of ${total}, this is the last page`
                      );
                      hasNextPage = false;
                    }
                  } else {
                    console.log(
                      "✅ [CartoTrade] Next button found and visible"
                    );
                    nextButton = nextBtn;
                    hasNextPage = true;
                  }
                } else {
                  console.log("✅ [CartoTrade] Next button found and visible");
                  nextButton = nextBtn;
                  hasNextPage = true;
                }
              }
            }
          }

          // If we found a next page, navigate to it
          if (hasNextPage && nextButton) {
            try {
              // Check if the button is visible and clickable
              if (await nextButton.isVisible()) {
                console.log(`➡️ [CartoTrade] Moving to next page...`);

                // Scroll to the button to ensure it's in view
                await nextButton.scrollIntoViewIfNeeded();
                await page.waitForTimeout(500);

                // Click the button
                await nextButton.click();

                // Wait for navigation with shorter timeout and better error handling
                try {
                  await page.waitForLoadState("domcontentloaded", {
                    timeout: 15000,
                  });
                  await page.waitForTimeout(2000);

                  // Verify we're on a new page by checking if content changed
                  const newCards = await page.$$(".panel");
                  if (newCards.length > 0) {
                    console.log(
                      `✅ [CartoTrade] Successfully navigated to page ${
                        currentPage + 2
                      }`
                    );
                    currentPage++;
                  } else {
                    console.log(
                      "⚠️ [CartoTrade] Navigation may have failed - no cards found on new page"
                    );
                    hasMorePages = false;
                  }
                } catch (loadError) {
                  console.log(
                    `⚠️ [CartoTrade] Page load timeout, but continuing...`
                  );
                  // Even if load times out, try to continue with current page
                  await page.waitForTimeout(3000);

                  // Check if we can still find cards
                  const newCards = await page.$$(".panel");
                  if (newCards.length > 0) {
                    console.log(
                      `✅ [CartoTrade] Continuing with page ${
                        currentPage + 2
                      } despite timeout`
                    );
                    currentPage++;
                  } else {
                    console.log(
                      "⚠️ [CartoTrade] No cards found after timeout, stopping pagination"
                    );
                    hasMorePages = false;
                  }
                }
              } else {
                console.log(
                  "⚠️ [CartoTrade] Next button not visible, stopping pagination"
                );
                hasMorePages = false;
              }
            } catch (clickError) {
              console.log(
                `❌ [CartoTrade] Error clicking next button: ${
                  clickError instanceof Error
                    ? clickError.message
                    : String(clickError)
                }`
              );
              hasMorePages = false;
            }
          } else {
            console.log(
              "🏁 [CartoTrade] No more pages found, stopping pagination"
            );
            hasMorePages = false;
          }
        } catch (error) {
          console.log(
            `⚠️ [CartoTrade] Error checking pagination: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          hasMorePages = false;
        }
      }

      console.log(
        `✅ [CartoTrade] Completed extraction from ${
          currentPage + 1
        } pages, total cars: ${allCarData.length}`
      );

      // Return the extracted car data array from all pages
      return allCarData;
    },
  };
}
