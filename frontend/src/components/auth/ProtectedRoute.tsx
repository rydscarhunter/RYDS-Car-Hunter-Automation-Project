
import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function ProtectedRoute() {
  const { user, isLoading, error } = useAuth();

  useEffect(() => {
    if (isLoading) {
      console.log("Protected route: Loading user data...");
    } else if (error) {
      console.error("Protected route error:", error);
    } else if (user) {
      console.log("Protected route: User authenticated", user.id);
    } else {
      console.log("Protected route: No authenticated user found");
    }
  }, [user, isLoading, error]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  // If not logged in, redirect to the auth page
  if (!user) {
    console.log("Protected route: Redirecting to auth page");
    return <Navigate to="/auth" replace />;
  }

  // Render the protected page
  return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  );
}
