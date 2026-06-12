import { createFileRoute } from "@tanstack/react-router";
import SSO from "../pages/integrations/SSO";

export const Route = createFileRoute("/_app/integrations/sso")({
  head: () => ({ meta: [{ title: "SSO / Active Directory — LAMS" }] }),
  component: SSO,
});
