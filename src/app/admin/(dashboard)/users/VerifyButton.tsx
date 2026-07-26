"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function VerifyButton({
    userId,
    currentlyVerified,
}: {
    userId: string;
    currentlyVerified: boolean;
}) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleToggle = async () => {
        setLoading(true);
        try {
            await fetch("/api/verify-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, verified: !currentlyVerified }),
            });
            router.refresh();
        } catch (err) {
            console.error("Failed to toggle verification:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${currentlyVerified
                    ? "bg-red-900/30 text-red-400 border border-red-800 hover:bg-red-900/50"
                    : "bg-green-900/30 text-green-400 border border-green-800 hover:bg-green-900/50"
                }`}
        >
            {loading ? "..." : currentlyVerified ? "Unverify" : "✓ Verify"}
        </button>
    );
}
