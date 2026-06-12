import { createFileRoute } from "@tanstack/react-router";
import Approvals from "../pages/manager/Approvals";

export const Route = createFileRoute("/_app/manager/approvals")({
  head: () => ({ meta: [{ title: "Approvals — LAMS" }] }),
  component: Approvals,
});
