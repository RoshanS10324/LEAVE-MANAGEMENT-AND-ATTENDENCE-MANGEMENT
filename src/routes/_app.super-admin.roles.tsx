import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import RolesPermissions from "../pages/super-admin/RolesPermissions";

export const Route = createFileRoute("/_app/super-admin/roles")({
  head: () => ({ meta: [{ title: "Roles & Permissions — LAMS" }] }),
  component: RouteGuard,
});

function RouteGuard() {
  const { isSuperAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isSuperAdmin) return <Navigate to="/dashboard" />;
  return <RolesPermissions />;
}
