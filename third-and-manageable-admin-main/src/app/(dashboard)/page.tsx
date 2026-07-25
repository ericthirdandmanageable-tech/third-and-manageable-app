import { adminDb } from "@/lib/firebase-admin";
import {
  CalendarDays,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

type SignupUser = {
  id: string;
  displayName: string;
  email: string;
  sport: string;
  school: string;
  verified: boolean;
  verificationRequested: boolean;
  joinedAt: string;
  joinedAtDate: Date | null;
};

const RECENT_SIGNUPS_LIMIT = 3;

function parseJoinedAt(joinedAt?: string): Date | null {
  if (!joinedAt) return null;

  const parsed = new Date(joinedAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatFullDate(date: Date | null): string {
  if (!date) return "No signup date";

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date | null): string {
  if (!date) return "Time unavailable";

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeDate(date: Date | null): string {
  if (!date) return "Missing joined_at";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const daysAgo = Math.floor(diffMs / dayMs);

  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo < 7) return `${daysAgo} days ago`;

  return `${Math.floor(daysAgo / 7)} week${daysAgo >= 14 ? "s" : ""} ago`;
}

function getInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "U";
}

async function getSignupOverview() {
  const profilesSnap = await adminDb.collection("profiles").get();

  const users: SignupUser[] = profilesSnap.docs.map((doc) => {
    const data = doc.data();
    const joinedAt = typeof data.joined_at === "string" ? data.joined_at : "";

    return {
      id: doc.id,
      displayName: data.display_name || "Unknown user",
      email: data.email || "No email on profile",
      sport: data.sport || "Unknown sport",
      school: data.school || "N/A",
      verified: data.verified === true,
      verificationRequested: data.verification_requested === true,
      joinedAt,
      joinedAtDate: parseJoinedAt(joinedAt),
    };
  });

  const sortedUsers = [...users].sort(
    (a, b) =>
      (b.joinedAtDate?.getTime() ?? 0) - (a.joinedAtDate?.getTime() ?? 0),
  );

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const signupsToday = users.filter(
    (user) => user.joinedAtDate && user.joinedAtDate >= startOfToday,
  ).length;

  const signupsThisWeek = users.filter(
    (user) => user.joinedAtDate && user.joinedAtDate >= sevenDaysAgo,
  ).length;

  const signupsThisMonth = users.filter(
    (user) => user.joinedAtDate && user.joinedAtDate >= startOfMonth,
  ).length;

  const verifiedCount = users.filter((user) => user.verified).length;
  const pendingVerificationCount = users.filter(
    (user) => user.verificationRequested && !user.verified,
  ).length;
  const withSignupDateCount = users.filter((user) => user.joinedAtDate).length;

  return {
    totalUsers: users.length,
    signupsToday,
    signupsThisWeek,
    signupsThisMonth,
    verifiedCount,
    pendingVerificationCount,
    withSignupDateCount,
    recentUsers: sortedUsers.slice(0, RECENT_SIGNUPS_LIMIT),
  };
}

export default async function OverviewPage() {
  const stats = await getSignupOverview();

  const summaryCards = [
    {
      label: "Today",
      value: stats.signupsToday,
      icon: CalendarDays,
      accent: "text-emerald-300",
      panel: "bg-emerald-500/10 border-emerald-400/20",
    },
    {
      label: "This month",
      value: stats.signupsThisMonth,
      icon: UserPlus,
      accent: "text-sky-300",
      panel: "bg-sky-500/10 border-sky-400/20",
    },
    {
      label: "Verified",
      value: stats.verifiedCount,
      icon: ShieldCheck,
      accent: "text-violet-300",
      panel: "bg-violet-500/10 border-violet-400/20",
    },
    {
      label: "Pending review",
      value: stats.pendingVerificationCount,
      icon: ShieldAlert,
      accent: "text-amber-300",
      panel: "bg-amber-500/10 border-amber-400/20",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-gray-800 bg-gradient-to-br from-gray-950 via-slate-900 to-emerald-950 p-5 sm:p-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
              Profiles collection
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              App signup dashboard
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-300 sm:text-base">
              This view reads Firestore profile documents and uses the
              <span className="mx-1 rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white">
                joined_at
              </span>
              field as the signup timestamp.
            </p>

            <div className="mt-8 flex flex-wrap items-end gap-4">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Total app signups
                </p>
                <p className="mt-2 text-5xl font-bold tracking-tight text-white sm:text-6xl">
                  {stats.totalUsers}
                </p>
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                {stats.signupsThisWeek} in the last 7 days
              </div>
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-xl">
            {summaryCards.map(({ label, value, icon: Icon, accent, panel }) => (
              <div
                key={label}
                className={`rounded-2xl border p-4 backdrop-blur ${panel}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
                      {label}
                    </p>
                    <p className={`mt-3 text-3xl font-bold ${accent}`}>
                      {value}
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/20 p-2 text-white">
                    <Icon size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <div className="rounded-[28px] border border-gray-800 bg-gray-900 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">
                Latest 3 signups
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                Newest users are pinned at the top.
              </p>
            </div>
            <div className="inline-flex w-fit items-center rounded-full border border-gray-700 bg-gray-950 px-3 py-1 text-xs font-medium text-gray-300">
              Newest to oldest
            </div>
          </div>

          {stats.recentUsers.length > 0 ? (
            <div className="mt-6 space-y-4">
              {stats.recentUsers.map((user, index) => (
                <article
                  key={user.id}
                  className="rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-950 to-gray-900 p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-sm font-bold tracking-[0.18em] text-emerald-300">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-800 text-sm font-bold text-white">
                        {getInitials(user.displayName)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold text-white sm:text-lg">
                            {user.displayName}
                          </h4>
                          <span className="inline-flex items-center rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-950">
                            New
                          </span>
                          {user.verified ? (
                            <span className="inline-flex items-center rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-[11px] font-semibold text-violet-200">
                              Verified
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 break-all text-sm text-gray-400">
                          {user.email}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-gray-700 bg-gray-950 px-3 py-1 text-xs text-gray-300 capitalize">
                            {user.sport.replaceAll("_", " ")}
                          </span>
                          <span className="rounded-full border border-gray-700 bg-gray-950 px-3 py-1 text-xs text-gray-300">
                            {user.school}
                          </span>
                          <span className="rounded-full border border-gray-700 bg-gray-950 px-3 py-1 text-xs text-gray-300">
                            {user.verificationRequested && !user.verified
                              ? "Verification requested"
                              : "Profile active"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-800 bg-black/20 px-4 py-3 lg:min-w-52 lg:text-right">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                        Signed up
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white sm:text-base">
                        {formatFullDate(user.joinedAtDate)}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatTime(user.joinedAtDate)} |{" "}
                        {formatRelativeDate(user.joinedAtDate)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-gray-800 bg-gray-950/60 px-5 py-12 text-center">
              <p className="text-base font-medium text-white">
                No profile signups found yet
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Recent signups will appear here once users create profiles.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-gray-800 bg-gray-900 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-300">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Signup totals
                </h3>
                <p className="text-sm text-gray-400">
                  Quick count of current profile records.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {[
                {
                  label: "Profiles with signup date",
                  value: stats.withSignupDateCount,
                },
                { label: "Signups today", value: stats.signupsToday },
                { label: "Signups this week", value: stats.signupsThisWeek },
                { label: "Signups this month", value: stats.signupsThisMonth },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-gray-800 bg-gray-950 px-4 py-3"
                >
                  <span className="text-sm text-gray-400">{item.label}</span>
                  <span className="text-lg font-semibold text-white">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-800 bg-gray-900 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-white">
              Reading the database
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              User signups are stored in the
              <span className="mx-1 rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white">
                profiles
              </span>
              collection. Each document is keyed by the auth user ID, and this
              dashboard uses
              <span className="mx-1 rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white">
                display_name
              </span>
              ,
              <span className="mx-1 rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white">
                email
              </span>
              ,
              <span className="mx-1 rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white">
                sport
              </span>
              ,
              <span className="mx-1 rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white">
                school
              </span>
              ,
              <span className="mx-1 rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white">
                verified
              </span>
              , and
              <span className="mx-1 rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white">
                joined_at
              </span>
              to build this overview.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
