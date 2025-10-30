import { ApiSearchRequest, ApiVehicle } from "./vehicleApi";

// SSE Event Types
export interface SSEConnectedEvent {
  type: "connected";
  message: string;
  totalSites: number;
  timestamp: string;
}

export interface SSEProgressEvent {
  type: "progress";
  siteName: string;
  cars: ApiVehicle[];
  totalSites: number;
  currentSite: number;
  timestamp: string;
}

export interface SSECompleteEvent {
  type: "complete";
  totalCars: number;
  results: ApiVehicle[];
  timestamp: string;
}

export interface SSEErrorEvent {
  type: "error";
  error: string;
  timestamp: string;
}

export type SSEEvent =
  | SSEConnectedEvent
  | SSEProgressEvent
  | SSECompleteEvent
  | SSEErrorEvent;

// SSE Progress Callback
export type SSEProgressCallback = (event: SSEEvent) => void;

// SSE Scraping Options
export interface SSEScrapingOptions {
  onProgress?: SSEProgressCallback;
  onConnected?: (event: SSEConnectedEvent) => void;
  onComplete?: (results: ApiVehicle[]) => void;
  onError?: (error: string) => void;
}

class ScrapeSSEApiService {
  private baseUrl: string;
  private abortController: AbortController | null = null;

  constructor() {
    // Default to localhost:3001, but can be overridden with environment variable
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
  }

  /**
   * Start real-time car scraping with SSE
   */
  async startScraping(
    searchRequest: ApiSearchRequest,
    options: SSEScrapingOptions = {}
  ): Promise<void> {
    try {
      // Cancel any existing scraping
      this.stopScraping();

      // Create new abort controller
      this.abortController = new AbortController();

      console.log("🚀 [SSE] Starting scraping session");
      console.log("📋 [SSE] Search parameters:", searchRequest);
      console.log(
        "🔗 [SSE] API endpoint:",
        `${this.baseUrl}/api/scrape-stream`
      );

      const response = await fetch(`${this.baseUrl}/api/scrape-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchRequest),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        console.error(`❌ [SSE] HTTP error! status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("✅ [SSE] HTTP response received successfully");
      console.log("📊 [SSE] Response status:", response.status);

      // Check if response is SSE (be more flexible with content type)
      const contentType = response.headers.get("content-type");

      // Allow both SSE and JSON content types for flexibility
      if (
        !contentType?.includes("text/event-stream") &&
        !contentType?.includes("application/json")
      ) {
        console.warn(
          "Unexpected content type, but continuing anyway:",
          contentType
        );
      }

      console.log("🌊 [SSE] Starting SSE stream processing");
      // Handle SSE stream
      await this.handleSSEStream(response, options);
    } catch (error) {
      console.error("SSE scraping failed:", error);

      if (error instanceof Error && error.name === "AbortError") {
        console.log("Scraping was cancelled");
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      options.onError?.(errorMessage);
    }
  }

  /**
   * Handle the SSE stream
   */
  private async handleSSEStream(
    response: Response,
    options: SSEScrapingOptions
  ): Promise<void> {
    console.log("📖 [SSE] Initializing stream reader");
    const reader = response.body?.getReader();
    if (!reader) {
      console.error("❌ [SSE] Response body is not readable");
      throw new Error("Response body is not readable");
    }

    console.log("✅ [SSE] Stream reader initialized successfully");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      console.log("🔄 [SSE] Starting stream reading loop");
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("🏁 [SSE] Stream reading completed");
          break;
        }

        // Decode chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        if (lines.length > 0) {
          console.log(`📝 [SSE] Processing ${lines.length} complete lines`);
        }

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(line.slice(6));
              console.log("📨 [SSE] Parsed event data:", eventData.type);
              this.handleSSEEvent(eventData, options);
            } catch (error) {
              console.error("❌ [SSE] Error parsing SSE data:", error);
            }
          }
        }
      }
    } finally {
      console.log("🔓 [SSE] Releasing stream reader lock");
      reader.releaseLock();
    }
  }

  /**
   * Handle individual SSE events
   */
  private handleSSEEvent(event: SSEEvent, options: SSEScrapingOptions): void {
    console.log(`🎯 [SSE] Handling ${event.type} event`);

    switch (event.type) {
      case "connected":
        console.log(
          "🔌 [SSE] Connection event received, calling onConnected callback"
        );
        options.onConnected?.(event);
        break;

      case "progress":
        console.log(
          "📊 [SSE] Progress event received, calling onProgress callback"
        );
        options.onProgress?.(event);
        break;

      case "complete":
        console.log(
          "✅ [SSE] Complete event received, calling onComplete callback"
        );
        options.onComplete?.(event.results);
        break;

      case "error":
        console.log("❌ [SSE] Error event received, calling onError callback");
        options.onError?.(event.error);
        break;

      default:
        console.warn("⚠️ [SSE] Unknown event type:", (event as any).type);
    }
  }

  /**
   * Stop the current scraping operation
   */
  stopScraping(): void {
    if (this.abortController) {
      console.log("🛑 [SSE] Stopping scraping session");
      this.abortController.abort();
      this.abortController = null;
      console.log("✅ [SSE] Scraping stopped successfully");
    } else {
      console.log("ℹ️ [SSE] No active scraping session to stop");
    }
  }

  /**
   * Check if scraping is currently active
   */
  isScraping(): boolean {
    return this.abortController !== null;
  }

  /**
   * Test SSE connection
   */
  async testSSEConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/scrape-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          make: "BMW",
          model: "3 Series",
          minPrice: 10000,
          maxPrice: 50000,
        }),
      });

      return (
        response.ok &&
        response.headers.get("content-type")?.includes("text/event-stream")
      );
    } catch (error) {
      console.error("SSE connection test failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const scrapeSSEApiService = new ScrapeSSEApiService();
