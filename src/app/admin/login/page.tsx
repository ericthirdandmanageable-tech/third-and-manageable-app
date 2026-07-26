"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const ADMIN_HOME = "/admin";

/**
 * Where to land after signing in. The proxy puts the blocked path in `?next`,
 * but it arrives from the URL bar and is therefore attacker-controlled: only a
 * same-origin path under /admin is honoured, so this cannot be turned into an
 * open redirect. Anything else falls back to the dashboard.
 */
function safeNext(raw: string | null): string {
    if (!raw || !raw.startsWith("/admin") || raw.startsWith("//")) {
        return ADMIN_HOME;
    }
    return raw;
}

function LoginForm() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const next = safeNext(useSearchParams().get("next"));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                router.push(next);
                router.refresh();
            } else {
                setError(
                    res.status === 503
                        ? "Admin sign-in is not configured."
                        : "Invalid credentials.",
                );
            }
        } catch {
            setError("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
            <div className="w-full max-w-sm">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white">T&M Admin</h1>
                        <p className="text-sm text-gray-400 mt-2">Third & Manageable Dashboard</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
                                Admin Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter admin password"
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    // `useSearchParams` opts the subtree into client rendering; the boundary
    // keeps the rest of the page prerenderable.
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
