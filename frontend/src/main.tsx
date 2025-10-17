
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

// Enhanced error handler for Select component errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  
  // Special handling for Select component errors
  if (event.error?.message?.includes('Select')) {
    console.error('Select component error details:', { 
      message: event.error.message,
      stack: event.error.stack,
      component: 'Likely in SearchForm.tsx or WebsiteForm.tsx'
    });
    
    // Log additional details that might help diagnose the issue
    try {
      const selectElements = document.querySelectorAll('[data-radix-select-trigger]');
      console.log('Found', selectElements.length, 'select elements on page');
    } catch (e) {
      console.error('Error inspecting select elements:', e);
    }
  }
});

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

try {
  console.log('Starting application...');
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  const root = createRoot(rootElement);
  
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
  
  console.log('Application rendered successfully');
} catch (error) {
  console.error('Failed to render application:', error);
  // Try to display a fallback UI directly
  try {
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; text-align: center; font-family: sans-serif;">
          <h2 style="color: #e11d48;">Application Error</h2>
          <p>Sorry, the application failed to load. Please try refreshing the page.</p>
          <p style="color: #666; font-size: 0.9em;">${error instanceof Error ? error.message : 'Unknown error'}</p>
          <button 
            onclick="window.location.reload()" 
            style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 16px;"
          >
            Reload Page
          </button>
        </div>
      `;
    }
  } catch (fallbackError) {
    console.error('Failed to render fallback UI:', fallbackError);
  }
}
