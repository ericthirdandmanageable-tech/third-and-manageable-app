import StatusBadge from "@/components/StatusBadge";
import { adminDb } from "@/lib/firebase-admin";
import UpdateStatusButton from "./UpdateStatusButton";

interface SupportRequest {
    id: string;
    user_id: string;
    display_name: string;
    type: string;
    message: string;
    status: string;
    created_at: string;
}

async function getSupportRequests(): Promise<SupportRequest[]> {
    const snap = await adminDb.collection("support_requests").get();
    const profilesSnap = await adminDb.collection("profiles").get();
    const profileMap = new Map<string, string>();
    profilesSnap.docs.forEach((d) => {
        profileMap.set(d.id, d.data().display_name || "Unknown");
    });

    return snap.docs
        .map((d) => ({
            id: d.id,
            user_id: d.data().user_id,
            display_name: profileMap.get(d.data().user_id) || "Unknown User",
            type: d.data().type || "peer",
            message: d.data().message || "",
            status: d.data().status || "pending",
            created_at: d.data().created_at || "",
        }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

const STATUS_VARIANT: Record<string, "warning" | "info" | "success"> = {
    pending: "warning",
    connected: "info",
    resolved: "success",
};

export default async function SupportPage() {
    const requests = await getSupportRequests();

    return (
        <div>
            <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Support Requests</h2>
                <p className="text-sm text-gray-400 mt-1">{requests.length} total requests</p>
            </div>

            <div className="space-y-4">
                {requests.map((req) => (
                    <div key={req.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 hover:border-gray-700 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className="text-xs sm:text-sm font-medium text-white">{req.display_name}</span>
                                    <StatusBadge status={req.type} variant={req.type === "moderator" ? "danger" : "info"} />
                                    <StatusBadge status={req.status} variant={STATUS_VARIANT[req.status] || "default"} />
                                </div>
                                <p className="text-xs sm:text-sm text-gray-300 mb-2 sm:mb-3">{req.message}</p>
                                <p className="text-xs text-gray-500">
                                    {req.created_at ? new Date(req.created_at).toLocaleString() : "N/A"}
                                </p>
                            </div>
                            <UpdateStatusButton requestId={req.id} currentStatus={req.status} />
                        </div>
                    </div>
                ))}
                {requests.length === 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                        <p className="text-gray-500">No support requests yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}
