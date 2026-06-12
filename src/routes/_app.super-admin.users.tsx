import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import UserManagement from "../pages/super-admin/UserManagement";

export const Route = createFileRoute("/_app/super-admin/users")({
  head: () => ({ meta: [{ title: "User Management — LAMS" }] }),
  component: RouteGuard,
});

function RouteGuard() {
  const { isSuperAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isSuperAdmin) return <Navigate to="/dashboard" />;
  return <UserManagement />;
}
