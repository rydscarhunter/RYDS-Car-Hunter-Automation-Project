
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error);
    console.error("Error details:", errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
    
    // Look for specific errors related to select components
    if (error.message.includes('Select') || error.message.includes('<Select.Item />')) {
      console.warn('Detected Select component error, see details above');
    }
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <p className="mb-4 text-gray-700">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          {this.state.error?.message.includes('Select') && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded mb-4 text-left max-w-lg">
              <p className="font-medium text-amber-800">Select Component Error</p>
              <p className="text-sm text-amber-700 mt-1">
                There appears to be an issue with a dropdown menu. This is often caused by 
                empty values in Select components.
              </p>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
