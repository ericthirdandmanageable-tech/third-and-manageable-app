import CopyEmailButton from "@/components/CopyEmailButton";
import StatusBadge from "@/components/StatusBadge";
import { adminDb } from "@/lib/firebase-admin";
import { Flame, Search, Shield, Users } from "lucide-react";
import UserActions from "./UserActions";
import VerifyButton from "./VerifyButton";

interface Profile {
  id: string;
  display_name: string;
  email: string;
  sport: string;
  athlete_status: string;
  school: string;
  streak: number;
  verified: boolean;
  verification_requested: boolean;
  joined_at: string;
  suspended: boolean;
  banned: boolean;
  chat_banned: boolean;
}

function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isNewUser(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return diff < 7 * 24 * 60 * 60 * 1000;
}

async function getUsers(search?: string): Promise<Profile[]> {
  const snap = await adminDb.collection("profiles").get();
  let users = snap.docs.map((d) => ({
    id: d.id,
    display_name: d.data().display_name || "Unknown",
    email: d.data().email || "",
    sport: d.data().sport || "N/A",
    athlete_status: d.data().athlete_status || "N/A",
    school: d.data().school || "N/A",
    streak: d.data().streak ?? 0,
    verified: d.data().verified === true,
    verification_requested: d.data().verification_requested === true,
    joined_at: d.data().joined_at || "",
    suspended: d.data().suspended === true,
    banned: d.data().banned === true,
    chat_banned: d.data().chat_banned === true,
  }));

  if (search) {
    const s = search.toLowerCase();
    users = users.filter(
      (u) =>
        u.display_name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.sport.toLowerCase().includes(s) ||
        u.school.toLowerCase().includes(s),
    );
  }

  return users.sort((a, b) => b.joined_at.localeCompare(a.joined_at));
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const users = await getUsers(params.search);
  const verifiedCount = users.filter((u) => u.verified).length;
  const suspendedCount = users.filter((u) => u.suspended).length;
  const bannedCount = users.filter((u) => u.banned).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Users
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Manage and monitor all registered users
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Total Users</p>
              <p className="text-2xl font-bold text-white mt-1">
                {users.length}
              </p>
            </div>
            <div className="p-2 bg-blue-900/30 rounded-lg">
              <Users size={18} className="text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Verified</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {verifiedCount}
              </p>
            </div>
            <div className="p-2 bg-green-900/30 rounded-lg">
              <Shield size={18} className="text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Suspended</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {suspendedCount}
              </p>
            </div>
            <div className="p-2 bg-yellow-900/30 rounded-lg">
              <Flame size={18} className="text-yellow-400" />
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Banned</p>
              <p className="text-2xl font-bold text-red-400 mt-1">
                {bannedCount}
              </p>
            </div>
            <div className="p-2 bg-red-900/30 rounded-lg">
              <Shield size={18} className="text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <form className="relative max-w-lg">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
        />
        <input
          name="search"
          type="text"
          defaultValue={params.search || ""}
          placeholder="Search by name, email, sport, or school..."
          className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
        />
      </form>

      {/* Users Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-3 border-b border-gray-800 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-300">
            {users.length} user{users.length !== 1 ? "s" : ""}
            {params.search && (
              <span className="text-gray-500">
                {" "}
                matching &quot;{params.search}&quot;
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500">Newest first</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-250">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-950/50">
                <th className="text-left px-3 sm:px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-12">
                  #
                </th>
                <th className="text-left px-3 sm:px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-3 sm:px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-3 sm:px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Sport
                </th>
                <th className="text-left px-3 sm:px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-3 sm:px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Streak
                </th>
                <th className="text-left px-3 sm:px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Verified
                </th>
                <th className="text-left px-3 sm:px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Verify
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => {
                const isNew = index < 3 && isNewUser(user.joined_at);
                return (
                  <tr
                    key={user.id}
                    className={`border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors ${
                      user.banned
                        ? "bg-red-950/10"
                        : user.suspended
                          ? "bg-yellow-950/10"
                          : ""
                    }`}
                  >
                    {/* Row number */}
                    <td className="px-3 sm:px-4 py-3">
                      <span className="text-xs font-mono text-gray-600">
                        {index + 1}
                      </span>
                    </td>

                    {/* User name + avatar + badges */}
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {user.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-white truncate">
                              {user.display_name}
                            </span>
                            {user.verified && (
                              <svg
                                className="w-3.5 h-3.5 text-blue-400 shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            {isNew && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                                NEW
                              </span>
                            )}
                          </div>
                          {/* Account status flags */}
                          <div className="flex items-center gap-1 mt-0.5">
                            {user.banned && (
                              <span className="text-[10px] text-red-400">
                                Banned
                              </span>
                            )}
                            {user.suspended && !user.banned && (
                              <span className="text-[10px] text-yellow-400">
                                Suspended
                              </span>
                            )}
                            {user.chat_banned && (
                              <span className="text-[10px] text-orange-400">
                                Chat banned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-3 sm:px-4 py-3">
                      <CopyEmailButton email={user.email} />
                    </td>

                    {/* Sport */}
                    <td className="px-3 sm:px-4 py-3">
                      <span className="text-xs sm:text-sm text-gray-300 capitalize">
                        {user.sport.replace("_", " ")}
                      </span>
                    </td>

                    {/* Athlete Status */}
                    <td className="px-3 sm:px-4 py-3">
                      <StatusBadge
                        status={user.athlete_status}
                        variant={
                          user.athlete_status === "current" ? "info" : "default"
                        }
                      />
                    </td>

                    {/* School */}
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-300 max-w-30 truncate">
                      {user.school}
                    </td>

                    {/* Streak */}
                    <td className="px-3 sm:px-4 py-3 text-center">
                      <span
                        className={`text-sm font-semibold ${
                          user.streak >= 7
                            ? "text-orange-400"
                            : user.streak >= 3
                              ? "text-yellow-400"
                              : "text-gray-400"
                        }`}
                      >
                        {user.streak > 0 && "🔥 "}
                        {user.streak}
                      </span>
                    </td>

                    {/* Verification status */}
                    <td className="px-3 sm:px-4 py-3">
                      {user.verified ? (
                        <StatusBadge status="Verified" variant="success" />
                      ) : user.verification_requested ? (
                        <StatusBadge status="Requested" variant="info" />
                      ) : (
                        <StatusBadge status="Unverified" variant="warning" />
                      )}
                    </td>

                    {/* Joined date */}
                    <td className="px-3 sm:px-4 py-3">
                      <div>
                        <p className="text-xs text-gray-300">
                          {formatRelativeDate(user.joined_at)}
                        </p>
                        {user.joined_at && (
                          <p className="text-[10px] text-gray-600">
                            {new Date(user.joined_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Verify action */}
                    <td className="px-3 sm:px-4 py-3 text-center">
                      <VerifyButton
                        userId={user.id}
                        currentlyVerified={user.verified}
                      />
                    </td>

                    {/* Moderation actions */}
                    <td className="px-3 sm:px-4 py-3 text-center">
                      <UserActions
                        userId={user.id}
                        displayName={user.display_name}
                        suspended={user.suspended}
                        banned={user.banned}
                      />
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <Users size={40} className="text-gray-700 mb-3" />
                      <p className="text-gray-500 text-sm">No users found</p>
                      {params.search && (
                        <p className="text-gray-600 text-xs mt-1">
                          Try a different search term
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
