# Real-Time Car Scraper Integration

This document explains how to use the new Server-Sent Events (SSE) integration for real-time car scraping in your frontend application.

## What's New

The frontend now includes a **Real-Time Scraper** component that provides:

- Live streaming of car extraction results
- Real-time progress tracking
- Site-by-site result organization
- Beautiful, modern UI that matches your existing design system

## How to Use

### 1. Navigate to the Sourcing Page

The Real-Time Scraper is integrated into your existing Sourcing page as a new tab:

1. Go to **Sourcing** in your navigation
2. Click on the **Real-Time Scraper** tab
3. Configure your search parameters
4. Click **Start Scraping**

### 2. Configure Search Parameters

The scraper supports the following search criteria:

- **Make**: Vehicle manufacturer (e.g., BMW, Audi, Mercedes)
- **Model**: Vehicle model (e.g., 3 Series, Q5, GLC)
- **Min Price**: Minimum price in pounds
- **Max Price**: Maximum price in pounds

### 3. Monitor Real-Time Progress

Once scraping starts, you'll see:

- **Progress Bar**: Visual indication of completion percentage
- **Live Statistics**:
  - Total cars found
  - Sites completed
  - Total sites being scraped
- **Real-Time Updates**: Results appear as each site completes

### 4. View Results

Results are organized in two views:

#### By Site

- Shows results grouped by website/dealer
- Each site displays the number of cars found
- Green checkmark indicates successful completion

#### All Results

- Combined view of all vehicles found
- Easy to scan through all results
- Shows key details: make, model, year, price, location

## Technical Details

### API Integration

The frontend connects to your backend via the `/api/scrape-stream` endpoint:

- Uses Server-Sent Events for real-time communication
- Automatically handles connection management
- Supports cancellation and error handling

### Environment Configuration

Set your backend API URL in your environment file:

```bash
# .env.local
VITE_API_BASE_URL=http://localhost:3001
```

If not set, it defaults to `http://localhost:3001`.

### Component Architecture

The integration consists of:

1. **`RealTimeScraper.tsx`**: Main component with UI and state management
2. **`scrapeSSEApi.ts`**: API service for SSE communication
3. **Updated `SourcingPage.tsx`**: Integration with existing sourcing functionality

## Features

### Real-Time Streaming

- Results appear immediately as they're extracted
- No need to wait for all sites to complete
- Live progress updates

### Error Handling

- Graceful handling of connection errors
- Site-specific error reporting
- Automatic retry and recovery

### User Experience

- Start/stop controls
- Progress indicators
- Elapsed time tracking
- Responsive design

### Data Management

- Automatic state cleanup
- Memory-efficient result handling
- Support for large result sets

## Troubleshooting

### Common Issues

1. **Connection Failed**

   - Check if your backend is running on the correct port
   - Verify the `VITE_API_BASE_URL` environment variable
   - Ensure CORS is properly configured on the backend

2. **No Results**

   - Check browser console for error messages
   - Verify search parameters are valid
   - Ensure backend scraping is working correctly

3. **Performance Issues**
   - Large result sets may cause UI lag
   - Consider implementing pagination for very large results
   - Monitor memory usage during long scraping sessions

### Debug Mode

Enable debug logging by checking the browser console:

- All SSE events are logged
- API requests and responses are detailed
- Error messages include stack traces

## Future Enhancements

Potential improvements for the next iteration:

- Save search parameters for reuse
- Export results to CSV/Excel
- Email notifications when scraping completes
- Scheduled scraping jobs
- Result filtering and sorting
- Integration with existing sourcing list

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify backend API is responding correctly
3. Test with simple search parameters first
4. Check network tab for failed requests
