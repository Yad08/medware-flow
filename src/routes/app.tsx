import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    // Client-side guard: localStorage is only available in browser.
    // SSR will pass through and the layout/component will protect on hydrate.
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("medware.auth.user");
      if (!raw) {
        throw redirect({ to: "/login" });
      }
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return <Outlet />;
}
