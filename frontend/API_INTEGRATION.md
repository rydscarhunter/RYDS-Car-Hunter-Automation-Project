# API Integration Setup

This frontend is now connected to your backend car search API. Here's how to set it up:

## Backend API Setup

1. **Start your backend API server:**

   ```bash
   cd ../../car-search
   npm install
   npm run start:api
   ```

   The API server will run on `http://localhost:3001` by default.

2. **Environment Variables:**
   Create a `.env` file in your backend directory with your website credentials:
   ```env
   BCA_USERNAME=your_bca_username
   BCA_PASSWORD=your_bca_password
   MOTORWAY_USERNAME=your_motorway_username
   MOTORWAY_PASSWORD=your_motorway_password
   CARWOW_USERNAME=your_carwow_username
   CARWOW_PASSWORD=your_carwow_password
   CARTOTRADE_USERNAME=your_cartotrade_username
   CARTOTRADE_PASSWORD=your_cartotrade_password
   DISPOSALNETWORK_USERNAME=your_disposalnetwork_username
   DISPOSALNETWORK_PASSWORD=your_disposalnetwork_password
   ```

## Frontend Configuration

1. **API Base URL:**
   The frontend will automatically connect to `http://localhost:3001`. If your API runs on a different port or URL, create a `.env` file in the frontend directory:

   ```env
   VITE_API_BASE_URL=http://your-api-url:port
   ```

2. **Start the frontend:**
   ```bash
   npm run dev
   ```

## How It Works

1. **Search Flow:**

   - User selects websites and enters search criteria
   - Frontend converts search params to API format
   - API request is sent to backend at `/api/scrape`
   - Backend scrapes the selected websites using Stagehand
   - Results are returned and displayed in the frontend

2. **Data Flow:**
   - Backend API returns vehicle data in a standardized format
   - Frontend converts API response to internal Vehicle format
   - Vehicles are grouped by source and displayed in results

## API Endpoints

- **POST** `/api/scrape` - Main search endpoint
  - Body: Search parameters (make, model, price range, etc.)
  - Returns: Array of vehicle objects

## Troubleshooting

1. **API Connection Issues:**

   - Ensure backend server is running on the correct port
   - Check CORS configuration in backend
   - Verify environment variables are set correctly

2. **No Results:**

   - Check website credentials in backend environment
   - Verify websites are active in frontend
   - Check browser console for API errors

3. **Authentication Issues:**
   - Ensure all required website credentials are set in backend
   - Check if websites require login and credentials are valid
