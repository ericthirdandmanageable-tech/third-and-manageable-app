import StatCard from "@/components/StatCard";
import { adminDb } from "@/lib/firebase-admin";
import { CalendarDays, ClipboardList, Star, Users } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
    "career-explore": "Career Exploration", "career-network": "Networking", "career-resume": "Resume & LinkedIn",
    "routine-morning": "Morning Routine", "routine-exercise": "Exercise", "routine-sleep": "Sleep Hygiene",
    "mindset-journal": "Journaling", "mindset-gratitude": "Gratitude", "mindset-meditation": "Meditation",
    "social-connect": "Social Connection", "social-mentor": "Mentorship", "social-community": "Community",
    "wellness-therapy": "Therapy", "wellness-nutrition": "Nutrition", "wellness-hobby": "New Hobby",
};

async function getGamePlanData() {
    const snap = await adminDb.collection("completions").get();
    const all = snap.docs.map((d) => ({
        id: d.id, user_id: d.data().user_id || "", action_id: d.data().action_id || "",
        date: d.data().date || "", completed_at: d.data().completed_at || "",
    }));

    const actionCounts: Record<string, number> = {};
    all.forEach((c) => { actionCounts[c.action_id] = (actionCounts[c.action_id] || 0) + 1; });

    const sortedActions = Object.entries(actionCounts)
        .map(([id, count]) => ({ id, label: ACTION_LABELS[id] || id, count }))
        .sort((a, b) => b.count - a.count);

    const uniqueUsers = new Set(all.map((c) => c.user_id)).size;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todayCount = all.filter((c) => c.date === todayStr).length;

    const dailyCounts: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        dailyCounts.push({ date: dateStr, count: all.filter((c) => c.date === dateStr).length });
    }

    return { total: all.length, uniqueUsers, todayCount, sortedActions, dailyCounts, mostPopular: sortedActions[0]?.label || "N/A" };
}

export default async function GamePlansPage() {
    const data = await getGamePlanData();
    const maxCount = data.sortedActions.length > 0 ? data.sortedActions[0].count : 1;
    const maxDaily = Math.max(...data.dailyCounts.map((d) => d.count), 1);

    return (
        <div>
            <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Game Plans</h2>
                <p className="text-sm text-gray-400 mt-1">Action completion analytics</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <StatCard title="Completions" value={data.total} icon={ClipboardList} />
                <StatCard title="Today" value={data.todayCount} icon={CalendarDays} />
                <StatCard title="Active Users" value={data.uniqueUsers} icon={Users} />
                <StatCard title="Top Action" value={data.mostPopular} icon={Star} />
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-4">7-Day Trend</h3>
                <div className="flex items-end gap-1 sm:gap-2 h-28 sm:h-32">
                    {data.dailyCounts.map((day) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] sm:text-xs text-gray-400">{day.count}</span>
                            <div className="w-full bg-green-500 rounded-t-md" style={{ height: `${(day.count / maxDaily) * 100}%`, minHeight: day.count > 0 ? "4px" : "0" }} />
                            <span className="text-[10px] sm:text-xs text-gray-500">{new Date(day.date + "T12:00:00").toLocaleDateString("en", { weekday: "short" })}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Most Completed</h3>
                    <div className="space-y-3">
                        {data.sortedActions.slice(0, 8).map((a) => (
                            <div key={a.id} className="flex items-center gap-2 sm:gap-3">
                                <span className="text-xs sm:text-sm text-gray-400 w-28 sm:w-36 truncate">{a.label}</span>
                                <div className="flex-1 bg-gray-800 rounded-full h-3 sm:h-4 overflow-hidden">
                                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(a.count / maxCount) * 100}%` }} />
                                </div>
                                <span className="text-xs text-gray-400 w-8 text-right">{a.count}</span>
                            </div>
                        ))}
                        {data.sortedActions.length === 0 && <p className="text-gray-500 text-sm">No data</p>}
                    </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Least Completed</h3>
                    <div className="space-y-3">
                        {data.sortedActions.slice(-8).reverse().map((a) => (
                            <div key={a.id} className="flex items-center gap-2 sm:gap-3">
                                <span className="text-xs sm:text-sm text-gray-400 w-28 sm:w-36 truncate">{a.label}</span>
                                <div className="flex-1 bg-gray-800 rounded-full h-3 sm:h-4 overflow-hidden">
                                    <div className="bg-orange-500 h-full rounded-full" style={{ width: `${(a.count / maxCount) * 100}%` }} />
                                </div>
                                <span className="text-xs text-gray-400 w-8 text-right">{a.count}</span>
                            </div>
                        ))}
                        {data.sortedActions.length === 0 && <p className="text-gray-500 text-sm">No data</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
