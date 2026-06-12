import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import SystemOverview from "../pages/super-admin/SystemOverview";

export const Route = createFileRoute("/_app/super-admin/overview")({
  head: () => ({ meta: [{ title: "System Overview — LAMS" }] }),
  component: RouteGuard,
});

function RouteGuard() {
  const { isSuperAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isSuperAdmin) return <Navigate to="/dashboard" />;
  return <SystemOverview />;
}
