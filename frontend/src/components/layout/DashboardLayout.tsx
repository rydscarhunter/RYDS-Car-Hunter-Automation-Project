
import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar from './DashboardSidebar';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

export default function DashboardLayout() {
  // This would be fetched from authentication service in a real app
  const user = {
    name: 'Demo User',
    role: 'Administrator',
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        
        <div className="flex-1">
          <header className="border-b bg-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-xl font-bold text-ryds-blue">Car Sourcing Bot</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                {user.name}
              </Button>
            </div>
          </header>
          
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
