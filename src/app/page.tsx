import { redirect } from "next/navigation";

/**
 * Placeholder root. `/` belonged to the admin dashboard until Phase 1 step 6
 * moved it under `/admin`; it becomes the athlete app at step 7, when
 * `web-prototype`'s routes are ported into `app/(athlete)/`
 * (VERCEL_MIGRATION_PLAN.md §4). Until then, redirect rather than 404 — the
 * admin portal is the only thing this deployment actually serves.
 */
export default function RootPage() {
    redirect("/admin");
}
