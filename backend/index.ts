import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig, {
  StagehandConfigWithProxies,
  StagehandConfigWithoutProxies,
} from "./stagehand.config.js";
import chalk from "chalk";
import boxen from "boxen";
import * as dotenv from "dotenv";
import { disposalnetworkConfig } from "./src/sites/disposalnetwork.js";
import { bcaConfig } from "./src/sites/bca.js";
import { motorwayConfig } from "./src/sites/motorway.js";
import { carwowConfig } from "./src/sites/carwow.js";
import { cartotradeConfig } from "./src/sites/cartotrade.js";
import type { SearchParams, LoginCredentials } from "./src/types/index.ts";

export type { SearchParams, LoginCredentials };

// Load environment variables
dotenv.config();

// Update SiteConfig type
type ExtractCarsFn = (page: any, params?: SearchParams) => Promise<any[]>;
export type SiteConfig = {
  name: string;
  baseUrl: string;
  loginUrl: string;
  buildSearchUrl?: (params: SearchParams) => string;
  login: (page: any, credentials: LoginCredentials) => Promise<void>;
  applyFilters: (page: any, params: SearchParams) => Promise<void>;
  filtersViaUI?: boolean;
  shouldNavigateToSearchUrl?: boolean;
  extractCars?: ExtractCarsFn;
  useProxies?: boolean; // New property to specify if this site needs proxies
};

/**
 * �� GLOBAL RESOURCE BLOCKING FUNCTION
 * Sets up comprehensive resource blocking to reduce bandwidth usage by 60-80%
 * Blocks CSS, images, fonts, media files, and tracking scripts while allowing
 * essential HTML, JavaScript, and API calls needed for scraping functionality
 */
async function setupSiteSpecificResourceBlocking(
  page: any,
  siteConfig: SiteConfig
) {
  const isProxySite = siteConfig.useProxies;
  console.log(
    `🚫 [Backend] Setting up ${
      isProxySite ? "aggressive" : "standard"
    } resource blocking for ${siteConfig.name}...`
  );

  await page.route("**/*", (route: any) => {
    const resourceType = route.request().resourceType();
    const url = route.request().url();

    // Block specific resource types that consume bandwidth but aren't essential for scraping
    const blockedTypes = [
      "image", // Images (jpg, png, gif, svg, webp, ico)
      "font", // Font files (woff, woff2, ttf, eot)
      "media", // Video and audio files (mp4, webm, mp3, wav)
      "other", // Other non-essential resources
    ];

    // For proxy sites (like BCA), also block CSS to save bandwidth
    if (isProxySite) {
      blockedTypes.push("stylesheet"); // CSS files
    }

    // Block by resource type
    if (blockedTypes.includes(resourceType)) {
      route.abort();
      return;
    }

    // Block common analytics, tracking, and advertising domains
    const blockedDomains = [
      "google-analytics.com",
      "googletagmanager.com",
      "facebook.com/tr",
      "doubleclick.net",
      "googlesyndication.com",
      "amazon-adsystem.com",
      "adsystem.amazon.com",
      "scorecardresearch.com",
      "quantserve.com",
      "outbrain.com",
      "taboola.com",
      "adsystem.amazon.com",
      "amazon-adsystem.com",
    ];

    const hasBlockedDomain = blockedDomains.some((domain) =>
      url.includes(domain)
    );
    if (hasBlockedDomain) {
      route.abort();
      return;
    }

    // Block specific file extensions that consume bandwidth
    const blockedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".svg",
      ".webp",
      ".ico",
      ".woff",
      ".woff2",
      ".ttf",
      ".eot",
      ".mp4",
      ".webm",
      ".ogg",
      ".mp3",
      ".wav",
    ];

    // For proxy sites (like BCA), also block CSS file extensions
    if (isProxySite) {
      blockedExtensions.push(".css", ".scss", ".sass", ".less", ".styl");
    }

    const hasBlockedExtension = blockedExtensions.some((ext) =>
      url.toLowerCase().includes(ext)
    );
    if (hasBlockedExtension) {
      const blockedExt = blockedExtensions.find((ext) =>
        url.toLowerCase().includes(ext)
      );
      route.abort();
      return;
    }

    // Allow the request to continue (HTML, JavaScript, XHR, Fetch)
    route.continue();
  });

  console.log(
    `✅ [Backend] ${
      isProxySite ? "Aggressive" : "Standard"
    } resource blocking active - estimated ${
      isProxySite ? "70-85%" : "60-80%"
    } bandwidth savings`
  );
}

/**
 * 🤘 Welcome to Stagehand! Thanks so much for trying us out!
 * 🛠️ CONFIGURATION: stagehand.config.ts will help you configure Stagehand
 *
 * 📝 Check out our docs for more fun use cases, like building agents
 * https://docs.stagehand.dev/
 *
 * 💬 If you have any feedback, reach out to us on Slack!
 * https://stagehand.dev/slack
 *
 * 📚 You might also benefit from the docs for Zod, Browserbase, and Playwright:
 * - https://zod.dev/
 * - https://docs.browserbase.com/
 * - https://playwright.dev/docs/intro
 */

async function run() {
  const results = await scrapeAllSites();
  console.log(
    boxen("All extracted car data:\n" + JSON.stringify(results, null, 2), {
      padding: 1,
      margin: 1,
      title: "Car Data",
    })
  );
  console.log(
    `\n🤘 Thanks so much for using Stagehand! Reach out to us on Slack if you have any feedback: ${chalk.blue(
      "https://stagehand.dev/slack"
    )}\n`
  );
}

// Helper to run promises in batches of N
async function runInBatches<T>(
  tasks: (() => Promise<T>)[],
  batchSize: number
): Promise<T[]> {
  console.log(
    `🔄 [Backend] Running ${tasks.length} tasks in batches of ${batchSize}`
  );
  const results: T[] = [];

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batchNumber = Math.floor(i / batchSize) + 1;
    const batchStart = i + 1;
    const batchEnd = Math.min(i + batchSize, tasks.length);

    console.log(
      `📦 [Backend] Processing batch ${batchNumber}: tasks ${batchStart}-${batchEnd} of ${tasks.length}`
    );

    const batch = tasks.slice(i, i + batchSize).map((fn) => fn());
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);

    console.log(
      `✅ [Backend] Batch ${batchNumber} completed: ${batchResults.length} results`
    );
  }

  console.log(
    `🏁 [Backend] All batches completed: ${results.length} total results`
  );
  return results;
}

// Exported function to scrape all sites, callable from an API
export async function scrapeAllSites(
  customParams?: Partial<SearchParams>,
  onProgress?: (
    siteName: string,
    cars: any[],
    totalSites: number,
    currentSite: number
  ) => void
): Promise<any[]> {
  console.log("🚀 [Backend] Starting scraping session for all sites");
  console.log("📋 [Backend] Search parameters:", customParams);

  // Create separate Stagehand instances for proxy and non-proxy sites
  const stagehandWithProxies = new Stagehand(StagehandConfigWithProxies);
  const stagehandWithoutProxies = new Stagehand(StagehandConfigWithoutProxies);

  console.log("🔧 [Backend] Initializing Stagehand instances...");
  await Promise.all([
    stagehandWithProxies.init(),
    stagehandWithoutProxies.init(),
  ]);

  console.log("✅ [Backend] Both Stagehand instances initialized successfully");

  // Use only custom params from API, do not merge with defaults
  const searchParams: SearchParams = customParams as SearchParams;

  // Define site configurations with login functionality
  console.log("🏗️ [Backend] Setting up site configurations...");
  const siteConfigs: Record<string, SiteConfig> = {
    bca: bcaConfig(stagehandWithProxies),
    // CarToTrade: cartotradeConfig(stagehandWithoutProxies),
    motorway: motorwayConfig(stagehandWithoutProxies),
    carwow: carwowConfig(stagehandWithoutProxies),
    disposalnetwork: disposalnetworkConfig(stagehandWithoutProxies),
  } as const;

  console.log(
    "✅ [Backend] Site configurations loaded:",
    Object.keys(siteConfigs)
  );

  // Define login credentials for each site
  const siteCredentials: Record<string, LoginCredentials> = {
    bca: {
      username: process.env.BCA_USERNAME || "",
      password: process.env.BCA_PASSWORD || "",
    },
    motorway: {
      username: process.env.MOTORWAY_USERNAME || "",
      password: process.env.MOTORWAY_PASSWORD || "",
    },
    carwow: {
      username: process.env.CARWOW_USERNAME || "",
      password: process.env.CARWOW_PASSWORD || "",
    },
    CarToTrade: {
      username: process.env.CARTOTRADE_USERNAME || "",
      password: process.env.CARWOW_PASSWORD || "",
    },
    disposalnetwork: {
      username: process.env.DISPOSALNETWORK_USERNAME || "",
      password: process.env.DISPOSALNETWORK_PASSWORD || "",
    },
  };

  // Log credential status for each site
  Object.entries(siteCredentials).forEach(([siteName, creds]) => {
    const hasUsername = !!creds.username;
    const hasPassword = !!creds.password;
    console.log(
      `🔑 [Backend] ${siteName}: Username ${
        hasUsername ? "✅" : "❌"
      }, Password ${hasPassword ? "✅" : "❌"}`
    );
  });

  const allCarData: any[] = [];
  const totalSites = Object.keys(siteConfigs).length;
  let currentSiteIndex = 0;

  // Track which sites need proxies vs which don't
  const proxySites = Object.values(siteConfigs).filter(
    (config) => config.useProxies
  );
  const nonProxySites = Object.values(siteConfigs).filter(
    (config) => !config.useProxies
  );

  // Note: Completion tracking removed since we now process proxy and non-proxy sites separately

  console.log(`🏢 [Backend] Total sites to scrape: ${totalSites}`);
  console.log(
    `🔧 [Backend] Sites requiring proxies: ${proxySites.length} (${proxySites
      .map((s) => s.name)
      .join(", ")})`
  );
  console.log(
    `🔧 [Backend] Sites without proxies: ${
      nonProxySites.length
    } (${nonProxySites.map((s) => s.name).join(", ")})`
  );
  console.log("🔄 [Backend] Starting batch processing...");

  // Note: Early cleanup function removed since we now process sites in separate groups

  async function processSite(siteConfig: SiteConfig) {
    console.log(`\n🌐 [Backend] Starting scrape for site: ${siteConfig.name}`);
    console.log(`📅 [Backend] Site ${currentSiteIndex + 1} of ${totalSites}`);

    // Choose the appropriate Stagehand instance based on proxy requirements
    const stagehand = siteConfig.useProxies
      ? stagehandWithProxies
      : stagehandWithoutProxies;
    const context = stagehand.context;

    console.log(
      `🔧 [Backend] Using ${
        siteConfig.useProxies ? "proxy-enabled" : "standard"
      } Stagehand instance for ${siteConfig.name}`
    );

    const newPage = await context.newPage();
    console.log(`📄 [Backend] New page created for ${siteConfig.name}`);

    // 🚫 SETUP SITE-SPECIFIC RESOURCE BLOCKING TO REDUCE BANDWIDTH
    // Set up blocking BEFORE any navigation to catch early resources
    await setupSiteSpecificResourceBlocking(newPage, siteConfig);

    // For proxy sites, also set up context-level blocking as backup
    if (siteConfig.useProxies && siteConfig.name !== "bca") {
      console.log(
        `🔧 [Backend] Setting up context-level CSS blocking for ${siteConfig.name}`
      );
      await context.route("**/*.css", (route) => {
        console.log(
          `🚫 [Backend] Context-level CSS block: ${route
            .request()
            .url()
            .substring(0, 80)}...`
        );
        route.abort();
      });
    }

    try {
      console.log(
        `🔐 [Backend] Checking credentials for ${siteConfig.name}...`
      );
      if (!siteCredentials[siteConfig.name]) {
        throw new Error(`No credentials found for ${siteConfig.name}`);
      }
      const credentials = siteCredentials[siteConfig.name];
      if (!credentials.username || !credentials.password) {
        throw new Error(`Missing username or password for ${siteConfig.name}`);
      }
      console.log(`✅ [Backend] Credentials validated for ${siteConfig.name}`);

      console.log(`🔑 [Backend] Logging into ${siteConfig.name}...`);
      await siteConfig.login(newPage, credentials);
      console.log(`✅ [Backend] Successfully logged into ${siteConfig.name}`);

      console.log(`⏳ [Backend] Waiting for page to load...`);
      await newPage.waitForLoadState("domcontentloaded");
      await newPage.waitForTimeout(2_000);
      console.log(`✅ [Backend] Page loaded for ${siteConfig.name}`);
      console.log(
        `🔍 [Backend] Checking search configuration for ${siteConfig.name}...`
      );
      console.log(
        `   - shouldNavigateToSearchUrl: ${siteConfig.shouldNavigateToSearchUrl}`
      );
      console.log(
        `   - buildSearchUrl function: ${
          typeof siteConfig.buildSearchUrl === "function"
            ? "Available"
            : "Not available"
        }`
      );

      if (
        siteConfig.shouldNavigateToSearchUrl &&
        typeof siteConfig.buildSearchUrl === "function"
      ) {
        console.log(
          `🌐 [Backend] Building search URL for ${siteConfig.name}...`
        );
        const searchUrl = siteConfig.buildSearchUrl(searchParams);
        console.log(`🔗 [Backend] Search URL: ${searchUrl}`);

        console.log(`🚀 [Backend] Navigating to search URL...`);
        await newPage.goto(searchUrl);
        await newPage.waitForLoadState("domcontentloaded");
        console.log(
          `✅ [Backend] Successfully navigated to search URL for ${siteConfig.name}`
        );
      } else {
        console.log(
          `ℹ️ [Backend] No search URL navigation needed for ${siteConfig.name}`
        );
      }
      if (typeof siteConfig.applyFilters === "function") {
        console.log(`🔧 [Backend] Applying filters for ${siteConfig.name}...`);
        await siteConfig.applyFilters(newPage, searchParams);
        console.log(
          `✅ [Backend] Filters applied successfully for ${siteConfig.name}`
        );
      } else {
        console.log(`ℹ️ [Backend] No filters to apply for ${siteConfig.name}`);
      }
      let extractedData = null;
      if (typeof siteConfig.extractCars === "function") {
        console.log(
          `📊 [Backend] Starting data extraction for ${siteConfig.name}...`
        );

        // Pass params for disposalnetwork, else call as before
        if (siteConfig.name === "disposalnetwork") {
          console.log(
            `🔍 [Backend] Using disposalnetwork-specific extraction with params`
          );
          extractedData = await siteConfig.extractCars(newPage, searchParams);
        } else {
          console.log(`🔍 [Backend] Using standard extraction method`);
          extractedData = await siteConfig.extractCars(newPage);
        }

        console.log(
          `✅ [Backend] ${siteConfig.name} extracted ${
            extractedData?.length || 0
          } cars`
        );

        if (extractedData && extractedData.length > 0) {
          console.log(`🚗 [Backend] Sample car data from ${siteConfig.name}:`, {
            make: extractedData[0]?.make,
            model: extractedData[0]?.model,
            price: extractedData[0]?.price,
            year: extractedData[0]?.year,
          });
        }

        // Emit progress if callback is provided
        if (onProgress && extractedData) {
          console.log(
            `📡 [Backend] Emitting progress for ${siteConfig.name}: ${extractedData.length} cars`
          );
          onProgress(
            siteConfig.name,
            extractedData,
            totalSites,
            currentSiteIndex + 1
          );
          console.log(`✅ [Backend] Progress emitted for ${siteConfig.name}`);
        } else if (onProgress) {
          console.log(
            `⚠️ [Backend] No data to emit progress for ${siteConfig.name}`
          );
        }
      } else {
        // No extraction if no custom extractCars
        console.log(
          `ℹ️ [Backend] No extractCars function available for ${siteConfig.name}`
        );
        extractedData = null;
      }

      currentSiteIndex++;
      console.log(`🏁 [Backend] Completed scraping for ${siteConfig.name}`);
      return extractedData;
    } catch (error) {
      console.error(`❌ [Backend] Error scraping ${siteConfig.name}:`, error);
      currentSiteIndex++;
      return null;
    } finally {
      console.log(`🧹 [Backend] Closing page for ${siteConfig.name}`);
      await newPage.close();
      console.log(`✅ [Backend] Page closed for ${siteConfig.name}`);
    }
  }

  // Separate sites by proxy requirements for proper concurrency management
  const proxySiteConfigs = Object.values(siteConfigs).filter(
    (config) => config.useProxies
  );
  const nonProxySiteConfigs = Object.values(siteConfigs).filter(
    (config) => !config.useProxies
  );

  const concurrencyLimit = Number(process.env.CONCURRENCY_LIMIT) || 5;

  console.log(
    `🔄 [Backend] Processing sites with separate concurrency management:`
  );
  console.log(
    `   - Proxy sites: ${proxySiteConfigs.length} (using proxy-enabled instance)`
  );
  console.log(
    `   - Non-proxy sites: ${nonProxySiteConfigs.length} (using standard instance)`
  );
  console.log(`   - Concurrency limit: ${concurrencyLimit}`);

  // Process proxy sites and non-proxy sites in parallel, but with separate concurrency limits
  const [proxyResults, nonProxyResults] = await Promise.all([
    // Process proxy sites with their own concurrency limit
    proxySiteConfigs.length > 0
      ? runInBatches(
          proxySiteConfigs.map((siteConfig) => () => processSite(siteConfig)),
          Math.min(concurrencyLimit, proxySiteConfigs.length)
        ).then(async (results) => {
          // Close proxy session immediately when proxy sites are done
          console.log(
            "🔧 [Backend] All proxy sites completed, closing proxy-enabled Stagehand instance..."
          );
          await stagehandWithProxies.close();
          console.log("✅ [Backend] Proxy-enabled Stagehand instance closed");
          return results;
        })
      : Promise.resolve([]),

    // Process non-proxy sites with their own concurrency limit
    nonProxySiteConfigs.length > 0
      ? runInBatches(
          nonProxySiteConfigs.map(
            (siteConfig) => () => processSite(siteConfig)
          ),
          Math.min(concurrencyLimit, nonProxySiteConfigs.length)
        ).then(async (results) => {
          // Close non-proxy session immediately when non-proxy sites are done
          console.log(
            "🔧 [Backend] All non-proxy sites completed, closing standard Stagehand instance..."
          );
          await stagehandWithoutProxies.close();
          console.log("✅ [Backend] Standard Stagehand instance closed");
          return results;
        })
      : Promise.resolve([]),
  ]);

  // Combine results from both groups
  const results = [...proxyResults, ...nonProxyResults];

  console.log(`📊 [Backend] All sites processed, compiling results...`);
  for (const siteData of results) {
    if (siteData) {
      if (Array.isArray(siteData)) {
        allCarData.push(...siteData);
        console.log(
          `📈 [Backend] Added ${siteData.length} cars from array result`
        );
      } else {
        allCarData.push(siteData);
        console.log(`📈 [Backend] Added 1 car from single result`);
      }
    } else {
      console.log(`ℹ️ [Backend] Skipping null/undefined site data`);
    }
  }

  console.log(`🏁 [Backend] Scraping session completed!`);
  console.log(`📊 [Backend] Total cars collected: ${allCarData.length}`);
  console.log(
    `✅ [Backend] All Stagehand instances already closed during processing`
  );

  return allCarData;
}
