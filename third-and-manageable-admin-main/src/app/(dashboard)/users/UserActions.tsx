"use client";

import { AlertTriangle, Ban, ShieldOff, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface UserActionsProps {
    userId: string;
    displayName: string;
    suspended: boolean;
    banned: boolean;
}

export default function UserActions({ userId, displayName, suspended, banned }: UserActionsProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<string | null>(null);
    const router = useRouter();

    const handleSuspend = async () => {
        setLoading("suspend");
        try {
            await fetch("/api/suspend-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, suspended: !suspended }),
            });
            router.refresh();
        } catch (err) {
            console.error("Failed to toggle suspension:", err);
        } finally {
            setLoading(null);
            setConfirmAction(null);
        }
    };

    const handleBan = async () => {
        setLoading("ban");
        try {
            await fetch("/api/ban-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, banned: !banned, banType: "platform" }),
            });
            router.refresh();
        } catch (err) {
            console.error("Failed to toggle ban:", err);
        } finally {
            setLoading(null);
            setConfirmAction(null);
        }
    };

    const handleDelete = async () => {
        setLoading("delete");
        try {
            await fetch("/api/delete-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            router.refresh();
        } catch (err) {
            console.error("Failed to delete user:", err);
        } finally {
            setLoading(null);
            setConfirmAction(null);
        }
    };

    if (confirmAction) {
        return (
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-yellow-400 mr-1">
                    {confirmAction === "delete"
                        ? `Delete ${displayName}?`
                        : confirmAction === "ban"
                          ? `${banned ? "Unban" : "Ban"} ${displayName}?`
                          : `${suspended ? "Unsuspend" : "Suspend"} ${displayName}?`}
                </span>
                <button
                    onClick={
                        confirmAction === "delete"
                            ? handleDelete
                            : confirmAction === "ban"
                              ? handleBan
                              : handleSuspend
                    }
                    disabled={loading !== null}
                    className="text-[10px] px-2 py-1 rounded-md font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                    {loading ? "..." : "Confirm"}
                </button>
                <button
                    onClick={() => setConfirmAction(null)}
                    className="text-gray-500 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5">
            <button
                onClick={() => setConfirmAction("suspend")}
                title={suspended ? "Unsuspend user" : "Suspend user"}
                className={`p-1.5 rounded-md transition-colors ${
                    suspended
                        ? "bg-yellow-900/40 text-yellow-400 hover:bg-yellow-900/60"
                        : "text-gray-500 hover:text-yellow-400 hover:bg-yellow-900/20"
                }`}
            >
                <AlertTriangle size={14} />
            </button>
            <button
                onClick={() => setConfirmAction("ban")}
                title={banned ? "Unban user" : "Ban user"}
                className={`p-1.5 rounded-md transition-colors ${
                    banned
                        ? "bg-red-900/40 text-red-400 hover:bg-red-900/60"
                        : "text-gray-500 hover:text-red-400 hover:bg-red-900/20"
                }`}
            >
                {banned ? <ShieldOff size={14} /> : <Ban size={14} />}
            </button>
            <button
                onClick={() => setConfirmAction("delete")}
                title="Delete user permanently"
                className="p-1.5 rounded-md text-gray-500 hover:text-red-500 hover:bg-red-900/20 transition-colors"
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
}
