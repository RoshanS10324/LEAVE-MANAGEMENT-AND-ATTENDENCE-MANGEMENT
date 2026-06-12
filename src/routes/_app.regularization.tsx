import { createFileRoute } from "@tanstack/react-router";
import Regularize from "../pages/employee/Regularize";

export const Route = createFileRoute("/_app/regularization")({
  head: () => ({ meta: [{ title: "Attendance Regularization — LAMS" }] }),
  component: Regularize,
});
