"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = ["pending", "connected", "resolved"];

export default function UpdateStatusButton({
    requestId,
    currentStatus,
}: {
    requestId: string;
    currentStatus: string;
}) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const currentIdx = STATUSES.indexOf(currentStatus);
    const nextStatus = STATUSES[currentIdx + 1];

    if (!nextStatus) return <span className="text-xs text-green-400">✓ Resolved</span>;

    const handleUpdate = async () => {
        setLoading(true);
        try {
            await fetch("/api/update-support", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId, status: nextStatus }),
            });
            router.refresh();
        } catch (err) {
            console.error("Failed to update:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleUpdate}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-900/30 text-blue-400 border border-blue-800 hover:bg-blue-900/50 transition-colors disabled:opacity-50"
        >
            {loading ? "..." : `Mark ${nextStatus}`}
        </button>
    );
}
