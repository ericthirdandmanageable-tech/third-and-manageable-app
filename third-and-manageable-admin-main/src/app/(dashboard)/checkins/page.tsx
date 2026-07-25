import StatCard from "@/components/StatCard";
import { adminDb } from "@/lib/firebase-admin";
import { CalendarDays, Heart, Smile, Users } from "lucide-react";

interface CheckIn {
    id: string;
    user_id: string;
    display_name: string;
    mood: number;
    note: string;
    date: string;
    created_at: string;
}

async function getCheckInData() {
    const [checkinsSnap, profilesSnap] = await Promise.all([
        adminDb.collection("checkins").get(),
        adminDb.collection("profiles").get(),
    ]);

    const profileMap = new Map<string, string>();
    profilesSnap.docs.forEach((d) => {
        profileMap.set(d.id, d.data().display_name || "Unknown");
    });

    const allCheckins: CheckIn[] = checkinsSnap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id, user_id: data.user_id || "", display_name: profileMap.get(data.user_id) || "Unknown",
            mood: data.mood || 3, note: data.note || "", date: data.date || "", created_at: data.created_at || "",
        };
    });

    const sorted = allCheckins.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const moods = allCheckins.map((c) => c.mood);
    const avgMood = moods.length > 0 ? (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1) : "N/A";
    const uniqueUsers = new Set(allCheckins.map((c) => c.user_id)).size;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todayCount = allCheckins.filter((c) => c.date === todayStr).length;

    const dailyCounts: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        dailyCounts.push({ date: dateStr, count: allCheckins.filter((c) => c.date === dateStr).length });
    }

    return { recent: sorted.slice(0, 50), total: allCheckins.length, avgMood, uniqueUsers, todayCount, dailyCounts };
}

const MOOD_COLOR: Record<number, string> = { 1: "text-red-400", 2: "text-orange-400", 3: "text-yellow-400", 4: "text-green-400", 5: "text-green-500" };

export default async function CheckInsPage() {
    const data = await getCheckInData();
    const maxDailyCount = Math.max(...data.dailyCounts.map((d) => d.count), 1);

    return (
        <div>
            <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Check-Ins</h2>
                <p className="text-sm text-gray-400 mt-1">Mood tracking and wellness analytics</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <StatCard title="Total Check-Ins" value={data.total} icon={Heart} />
                <StatCard title="Today" value={data.todayCount} icon={CalendarDays} />
                <StatCard title="Average Mood" value={data.avgMood} icon={Smile} />
                <StatCard title="Unique Users" value={data.uniqueUsers} icon={Users} />
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-4">7-Day Trend</h3>
                <div className="flex items-end gap-1 sm:gap-2 h-28 sm:h-32">
                    {data.dailyCounts.map((day) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] sm:text-xs text-gray-400">{day.count}</span>
                            <div className="w-full bg-blue-500 rounded-t-md" style={{ height: `${(day.count / maxDailyCount) * 100}%`, minHeight: day.count > 0 ? "4px" : "0" }} />
                            <span className="text-[10px] sm:text-xs text-gray-500">{new Date(day.date + "T12:00:00").toLocaleDateString("en", { weekday: "short" })}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800">
                    <h3 className="font-semibold text-white text-sm sm:text-base">Recent Check-Ins</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                        <thead>
                            <tr className="border-b border-gray-800">
                                <th className="text-left px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium text-gray-400">User</th>
                                <th className="text-left px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium text-gray-400">Mood</th>
                                <th className="text-left px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium text-gray-400">Note</th>
                                <th className="text-left px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium text-gray-400">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.recent.map((c) => (
                                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                                    <td className="px-4 sm:px-6 py-3 text-xs sm:text-sm text-white">{c.display_name}</td>
                                    <td className="px-4 sm:px-6 py-3"><span className={`text-sm ${MOOD_COLOR[c.mood] || ""}`}>{c.mood}/5</span></td>
                                    <td className="px-4 sm:px-6 py-3 text-xs sm:text-sm text-gray-300 max-w-[200px] truncate">{c.note || "—"}</td>
                                    <td className="px-4 sm:px-6 py-3 text-xs text-gray-400">{c.created_at ? new Date(c.created_at).toLocaleDateString() : c.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
