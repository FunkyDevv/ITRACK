import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { logoutUser } from "@/lib/firebase";
import {
  BarChart3,
  Users,
  Plus,
  Calendar,
  Settings,
  FileText,
  TrendingUp,
  Home,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  CheckSquare,
} from "lucide-react";

interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: (href: string) => void;
  currentPage?: string;
  onMobileClose?: () => void;
}

export function Sidebar({ className, collapsed = false, onToggle, onNavigate, currentPage = "/", onMobileClose }: SidebarProps) {
  const { userProfile } = useAuth();
  const [, setLocation] = useLocation();
  const isSupervisor = userProfile?.role === "supervisor";
  const isTeacher = userProfile?.role === "teacher";

  const handleLogout = async () => {
    try {
      await logoutUser();
      // Redirect to home page after logout
      setLocation("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navigationItems = [
    // Common item for all roles
    {
      title: "Dashboard",
      icon: Home,
      href: "/dashboard",
      active: false,
    },
    // Supervisor navigation
    ...(isSupervisor ? [
      {
        title: "Interns",
        icon: Users,
        href: "/manage-interns",
        active: false,
      },
      {
        title: "Add Teacher",
        icon: UserPlus,
        href: "/add-teacher",
        active: false,
      },
      {
        title: "Manage Teachers",
        icon: Users,
        href: "/manage-teachers",
        active: false,
      },
      {
        title: "DTR Reports",
        icon: FileText,
        href: "/dtr-reports",
        active: false,
      },
    ] : []),
    // Teacher navigation
    ...(isTeacher ? [
      {
        title: "My Interns",
        icon: Users,
        href: "/my-interns",
        active: false,
      },
      {
        title: "Add Task",
        icon: CheckSquare,
        href: "/add-task",
        active: false,
      },
      {
        title: "View Tasks",
        icon: FileText,
        href: "/view-tasks",
        active: false,
      },
    ] : []),
    // Intern navigation
    ...(!isSupervisor && !isTeacher ? [
      {
        title: "My Tasks",
        icon: CheckSquare,
        href: "/tasks",
        active: false,
      },
      {
        title: "Attendance History",
        icon: FileText,
        href: "/attendance-history",
        active: false,
      },
    ] : []),
    {
      title: "Settings",
      icon: Settings,
      href: "/settings",
      active: false,
    },
  ];

  return (
    <div className={cn(
      "relative flex h-full flex-col bg-card border-r border-border transition-all duration-300",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="bg-primary text-primary-foreground w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm">
              I
            </div>
            <span className="text-lg font-bold text-foreground">I-TRACK</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            onToggle?.();
            onMobileClose?.();
          }}
          className="h-8 w-8"
          data-testid="button-toggle-sidebar"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 text-primary w-10 h-10 rounded-full flex items-center justify-center font-semibold">
              {userProfile?.firstName?.[0]}{userProfile?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {userProfile?.firstName} {userProfile?.lastName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {userProfile?.role}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2">
          <ul className="space-y-1">
            {navigationItems.map((item) => (
              <li key={item.href}>
                <Button
                  variant={
                    currentPage === item.href || 
                    (item.href === "/manage-interns" && (currentPage === "/manage-interns" || (currentPage?.includes("/manage-teachers/") && currentPage?.includes("/interns/")))) ||
                    (item.href === "/manage-teachers" && currentPage?.startsWith("/manage-teachers/") && !currentPage?.includes("/interns/"))
                    ? "secondary" : "ghost"
                  }
                  className={cn(
                    "w-full justify-start",
                    collapsed ? "px-2" : "px-3",
                    (currentPage === item.href || 
                     (item.href === "/manage-interns" && (currentPage === "/manage-interns" || (currentPage?.includes("/manage-teachers/") && currentPage?.includes("/interns/")))) ||
                     (item.href === "/manage-teachers" && currentPage?.startsWith("/manage-teachers/") && !currentPage?.includes("/interns/"))
                    ) && "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                  onClick={() => onNavigate?.(item.href)}
                  data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon className={cn("h-4 w-4", collapsed ? "" : "mr-3")} />
                  {!collapsed && <span>{item.title}</span>}
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-muted-foreground hover:text-foreground hover:bg-destructive/10",
            collapsed ? "px-2" : "px-3"
          )}
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className={cn("h-4 w-4", collapsed ? "" : "mr-3")} />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
}