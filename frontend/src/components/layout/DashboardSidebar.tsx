import React from "react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Search, User } from "lucide-react";

// To avoid hard-coding menu items
const MENU_ITEMS = [
  {
    id: "search",
    label: "Search",
    path: "/",
    icon: Search,
  },
  {
    id: "account",
    label: "Account",
    path: "/account",
    icon: User,
  },
];

export default function DashboardSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="font-bold text-xl text-white flex items-center gap-2">
          <div className="bg-white text-sidebar rounded-md p-1 w-8 h-8 flex items-center justify-center">
            R
          </div>
          <span>RYDS</span>
          <span className="text-sm font-normal ml-auto opacity-80">v1.0</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MENU_ITEMS.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        cn(
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : ""
                        )
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 text-xs text-sidebar-foreground/70">
        <div>© 2025 RYDS Group Ltd</div>
      </SidebarFooter>
    </Sidebar>
  );
}
