import { createFileRoute } from "@tanstack/react-router";
import AttendanceLog from "../pages/employee/AttendanceLog";

export const Route = createFileRoute("/_app/attendance-logs")({
  head: () => ({ meta: [{ title: "Attendance Logs — LAMS" }] }),
  component: AttendanceLog,
});
