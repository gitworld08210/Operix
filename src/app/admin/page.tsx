import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/serverSession";

import AdminDashboardClient from "./AdminDashboardClient";

/**
 * Admin panel entry point.
 *
 * This is a server component whose only job is to gate access: it verifies the
 * session cookie on the server and redirects anyone without `role: "admin"` to
 * the admin login page. The dashboard UI itself stays a client component
 * (AdminDashboardClient) because it is interactive.
 *
 * Doing the check here — rather than in a `useEffect` in the client, as the
 * previous version did — means unauthorised users never receive the admin markup
 * at all, instead of briefly rendering it and then navigating away.
 *
 * A `middleware.ts` guard was considered and deliberately not used: Next.js
 * middleware runs on the Edge runtime, which has no `node:crypto`, and the
 * session signature is verified with `node:crypto` HMAC. A server component runs
 * on the Node runtime, where that verification works. The API routes are gated
 * independently by `isAuthorizedAdmin`, so this page guard is defence in depth
 * rather than the only control.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard",
};

export default function AdminPage() {
  const session = getServerSession();

  if (session?.role !== "admin") {
    redirect("/admin/login");
  }

  return <AdminDashboardClient />;
}
