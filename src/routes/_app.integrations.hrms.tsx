import { createFileRoute } from "@tanstack/react-router";
import HRMS from "../pages/integrations/HRMS.tsx";

export const Route = createFileRoute("/_app/integrations/hrms")({
  head: () => ({ meta: [{ title: "HRMS Integration — LAMS" }] }),
  component: HRMS,
});
