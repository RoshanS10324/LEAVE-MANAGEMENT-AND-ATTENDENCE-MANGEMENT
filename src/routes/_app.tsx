import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { useLeaveStore } from "../store/useLeaveStore";
import { useNotifications } from "../hooks/useNotifications";
import {
  LayoutDashboard,
  Users,
  Building2,
  BadgeCheck,
  ShieldCheck,
  Clock,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  FileBarChart,
  Settings,
  Plug,
  ScrollText,
  KeyRound,
  Database,
  Fingerprint,
  ChevronDown,
  Search,
  Bell,
  Plus,
  Activity,
  ChevronRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

type NavItem = {
  label: string;
  to?: string;
  icon?: any;
  children?: { label: string; to: string; badge?: string; visibleTo?: ("employee" | "manager" | "hr" | "super_admin")[] }[];
  visibleTo?: ("employee" | "manager" | "hr" | "super_admin")[];
  defaultOpen?: boolean;
};

const NAV: { group: string; items: NavItem[]; visibleTo?: ("employee" | "manager" | "hr" | "super_admin")[] }[] = [
  { group: "Overview", items: [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "My Profile", to: "/profile", icon: BadgeCheck },
  ] },
  {
    group: "Workforce",
    items: [
      {
        label: "Employee Management",
        icon: Users,
        children: [
          { label: "Employees", to: "/employees" },
          { label: "Departments", to: "/departments" },
          { label: "Designations", to: "/designations" },
          { label: "Roles", to: "/roles" },
        ],
      },
      {
        label: "Attendance",
        icon: Clock,
        children: [
          { label: "Attendance Logs", to: "/attendance-logs", visibleTo: ["employee", "manager", "hr"] },
          { label: "Regularization", to: "/regularization", visibleTo: ["employee", "manager", "hr"] },
          { label: "Overtime", to: "/overtime", visibleTo: ["employee", "manager", "hr"] },
          { label: "Shifts", to: "/shifts" },
          { label: "Holiday Calendar", to: "/holidays" },
        ],
      },
      {
        label: "Leave Management",
        icon: CalendarCheck,
        children: [
          { label: "Apply Leave", to: "/apply-leave", visibleTo: ["employee", "manager", "hr"] },
          { label: "Leave Requests", to: "/leave-requests", visibleTo: ["employee", "manager", "hr"] },
          { label: "Leave Policies", to: "/leave-policies" },
          { label: "Leave Balances", to: "/leave-balances" },
        ],
      },
      {
        label: "Approvals",
        icon: ClipboardCheck,
        children: [
          { label: "Leave Approvals", to: "/leave-approvals" },
          { label: "Attendance Approvals", to: "/attendance-approvals" },
          { label: "Manager Approvals", to: "/manager/approvals" },
        ],
      },
    ],
  },
  {
    group: "HR Admin",
    visibleTo: ["hr", "super_admin"],
    items: [
      {
        label: "Shift Scheduling",
        icon: CalendarDays,
        to: "/hr/shifts",
      },
    ],
  },
  {
    group: "Insights",
    items: [
      {
        label: "Reports",
        icon: FileBarChart,
        to: "/reports",
      },
    ],
  },
  {
    group: "System",
    visibleTo: ["hr", "super_admin"],
    items: [
      {
        label: "Administration",
        icon: ShieldCheck,
        children: [
          { label: "Users", to: "/admin/users" },
          { label: "Roles", to: "/admin/roles" },
          { label: "Policies", to: "/admin/policies" },
          { label: "Audit Logs", to: "/admin/audit" },
        ],
      },
    ],
  },
  { 
    group: "Integrations", 
    visibleTo: ["hr", "super_admin"],
    items: [
      {
        label: "Integrations",
        icon: Plug,
        defaultOpen: true,
        children: [
          { label: "HRMS", to: "/integrations/hrms", badge: "active" },
          { label: "Payroll", to: "/integrations/payroll" },
          { label: "Biometric", to: "/integrations/biometric" },
          { label: "SSO", to: "/integrations/sso" },
        ],
      },
      { label: "Settings", to: "/settings", icon: Settings },
    ] 
  },
  {
    group: "Super Admin",
    visibleTo: ["super_admin"],
    items: [
      {
        label: "System Overview",
        icon: Activity,
        to: "/super-admin/overview",
      },
      {
        label: "User Management",
        icon: Users,
        to: "/super-admin/users",
      },
      {
        label: "Roles & Permissions",
        icon: ShieldCheck,
        to: "/super-admin/roles",
      },
    ],
  },
];

function AppLayout() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { employee, isLoading, logout } = useAuth();
  const { hydrate, pendingLeaves } = useLeaveStore();
  const { notifications, unreadCount, markAllRead } = useNotifications(employee?.id);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!employee) {
      navigate({ to: "/login" });
    }
  }, [employee, isLoading, navigate]);

  useEffect(() => {
    if (employee) {
      hydrate(employee.role, employee.id);
    }
  }, [employee, hydrate]);

  if (isLoading || !employee) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-12 w-12 rounded-xl bg-white shadow-sm grid place-items-center mx-auto animate-pulse px-2">
            <img src="/ror-logo.png/rorlogin2026-06-12%20091120.png" alt="ROR" className="h-8 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<span class="text-black font-bold">ROR</span>'; }} />
          </div>
          <p className="mt-4 text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  const handleNotificationClick = async (n: any) => {
    setNotifOpen(false);

    // Determine route based on message and role
    const msg = n.message.toLowerCase();
    const role = employee?.role || "employee";
    let route = "/dashboard";
    
    // Leave logic
    if (msg.includes("leave request was approved by") || msg.includes("hr validation needed") || (msg.includes("applied for") && msg.includes("leave"))) {
      route = role === "manager" ? "/manager/approvals" : "/leave-approvals";
    } else if (msg.includes("your leave for") || msg.includes("your leave request")) {
      route = "/leave-requests";
    }
    // Overtime logic
    else if (msg.includes("overtime request approved by") || msg.includes("submitted an overtime request")) {
      route = role === "manager" ? "/manager/approvals" : "/overtime";
    } else if (msg.includes("your overtime for")) {
      route = "/overtime";
    }
    // Regularization logic
    else if (msg.includes("your regularization request")) {
      route = "/regularization";
    } else if (msg.includes("regularization request")) {
      route = role === "manager" ? "/manager/approvals" : (["hr", "super_admin"].includes(role) ? "/attendance-approvals" : "/regularization");
    }

    navigate({ to: route });

    // Mark as read in background if needed
    if (!n.read) {
      // In a real app we'd trigger the hook or supabase update here
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    }
  };

  const initials = employee?.name
    ? employee.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
    : "U";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 flex-shrink-0 h-full bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ${sidebarCollapsed ? "w-20" : "w-72"} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className={`h-16 flex items-center ${sidebarCollapsed ? "justify-center px-0" : "justify-between px-6"}`}>
          {sidebarCollapsed ? (
            <button onClick={() => setSidebarCollapsed(false)} className="text-slate-400 hover:text-white p-2" title="Expand sidebar">
              <PanelLeftOpen className="h-5 w-5" />
            </button>
          ) : (
            <>
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white shadow-sm grid place-items-center shrink-0">
                  <img src="/ror-logo.png/rorlogin2026-06-12%20091120.png" alt="ROR" className="h-6 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<span class="text-black text-xs font-bold">ROR</span>'; }} />
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-sm leading-none text-white">ROR Technologies</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1 truncate">
                    Workforce Ops
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-1">
                <button onClick={() => setSidebarCollapsed(true)} className="hidden lg:inline-flex text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800" title="Collapse sidebar">
                  <PanelLeftClose className="h-4 w-4" />
                </button>
                <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-900 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600 [scrollbar-width:thin] [scrollbar-color:#334155_#0f172a]">
          {NAV.filter((g) => !g.visibleTo || g.visibleTo.includes(employee.role)).map((g) => (
            <div key={g.group}>
              {!sidebarCollapsed && (
                <div className="px-3 mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  {g.group}
                </div>
              )}
              <div className="space-y-1">
                {g.items.map((it) => (
                  <SidebarItem key={it.label} item={it} collapsed={sidebarCollapsed} role={employee.role} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className={`mt-auto ${sidebarCollapsed ? "p-3" : "p-4"}`}>
          <div className={`rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center ${sidebarCollapsed ? "justify-center p-2" : "p-3 gap-3"}`}>
            <Avatar className="h-10 w-10 border border-slate-700 shrink-0">
              <AvatarFallback className="bg-slate-700 text-white text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{employee?.name || "Loading..."}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {employee?.designation || "Employee"}
                  </div>
                </div>
                <button onClick={logout} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg shrink-0 transition-colors" title="Log out">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 relative min-w-0 transition-all duration-300">
        {/* Topbar */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 h-16 flex items-center gap-3 px-5">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5 text-slate-700" />
          </button>
          <button
            className="hidden lg:inline-flex text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search employees, requests, policies…"
              className="pl-9 h-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] text-slate-400 font-medium">
              ⌘K
            </kbd>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button className="hidden md:inline-flex bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm px-4 h-10 font-medium transition-all" asChild>
              <Link to="/apply-leave">
                <Plus className="h-4 w-4 mr-1" /> Quick Action
              </Link>
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl h-10 w-10"
                aria-label="Notifications"
                onClick={() => setNotifOpen(!notifOpen)}
                onBlur={() => setTimeout(() => setNotifOpen(false), 200)}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white" />
                )}
              </Button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n: any) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? "bg-indigo-50/50" : ""}`}
                        >
                          <div className="text-sm font-medium text-slate-900">{n.message}</div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            {new Date(n.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" className="relative text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl h-10 w-10" aria-label="Approvals" asChild>
              <Link to="/leave-approvals">
                <ClipboardCheck className="h-5 w-5" />
                {pendingLeaves.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                    {pendingLeaves.length}
                  </Badge>
                )}
              </Link>
            </Button>
            <div className="h-7 w-px bg-slate-200 mx-1" />
            <Avatar className="h-10 w-10 border border-slate-200 shadow-sm">
              <AvatarFallback className="bg-indigo-600 text-white text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}

function SidebarItem({ item, collapsed, role }: { item: NavItem; collapsed?: boolean; role?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const filteredChildren = item.children?.filter(c => !c.visibleTo || (role && c.visibleTo.includes(role as any)));
  const hasChildren = !!filteredChildren?.length;
  const childActive = hasChildren && filteredChildren!.some((c) => pathname.startsWith(c.to));
  const [open, setOpen] = useState(childActive || item.defaultOpen === true);
  const Icon = item.icon;

  if (collapsed) {
    const active = hasChildren ? childActive : pathname === item.to;
    return (
      <Link
        to={item.to || item.children?.[0]?.to || "#"}
        title={item.label}
        className={`flex items-center justify-center p-3 my-1 transition-colors rounded-xl ${active ? "bg-indigo-600 text-white shadow-sm font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
      >
        {Icon && <Icon className="h-5 w-5" />}
      </Link>
    );
  }

  if (!hasChildren && item.to) {
    const active = pathname === item.to;
    return (
      <Link
        to={item.to}
        className={`flex items-center gap-3 px-4 py-2.5 my-0.5 text-sm transition-colors rounded-xl ${active ? "bg-indigo-600 text-white shadow-sm font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
      >
        {Icon && <Icon className="h-4 w-4" />}
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 my-0.5 text-sm transition-colors rounded-xl ${childActive ? "text-white font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
      >
        {Icon && <Icon className="h-4 w-4" />}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-1 ml-7 pl-3 border-l border-slate-700/50 space-y-1">
          {filteredChildren!.map((c) => {
            const active = pathname === c.to;
            return (
              <Link
                key={c.to}
                to={c.to}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] transition-colors ${active ? "bg-indigo-600 text-white shadow-sm font-medium" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
              >
                {c.label}
                {c.badge === "active" && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Active" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
