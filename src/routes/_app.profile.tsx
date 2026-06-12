import { createFileRoute } from "@tanstack/react-router";
import Profile from "../pages/Profile";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "My Profile — LAMS" }] }),
  component: () => {
    console.log("[Router] Rendering Profile Route");
    return <Profile />;
  },
});
