import { createFileRoute } from "@tanstack/react-router";
import Payroll from "../pages/integrations/Payroll.tsx";

export const Route = createFileRoute("/_app/integrations/payroll")({
  head: () => ({ meta: [{ title: "Payroll Integration — LAMS" }] }),
  component: Payroll,
});
