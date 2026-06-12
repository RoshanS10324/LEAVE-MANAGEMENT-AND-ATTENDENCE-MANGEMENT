import { createFileRoute } from "@tanstack/react-router";
import ShiftScheduling from "../pages/hr/ShiftScheduling";

export const Route = createFileRoute("/_app/hr/shifts")({
  head: () => ({ meta: [{ title: "Shift Scheduling — LAMS" }] }),
  component: ShiftScheduling,
});
