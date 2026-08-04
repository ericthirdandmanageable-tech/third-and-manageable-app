/*
 * API client for the Third & Manageable backend (FastAPI bridge).
 * Every call returns null on network/HTTP failure so callers can show explicit
 * empty or unavailable states without leaking transport concerns into pages.
 *
 * The bridge is temporary: at Phase 2 these paths become Route Handlers under
 * `app/api/` and `BASE` goes away (VERCEL_MIGRATION_PLAN.md §2.0). This file
 * is the porting checklist — every endpoint the athlete app depends on is
 * typed here and nowhere else.
 *
 * Every id on the wire is a UUID string. The Drizzle baseline replaced the
 * integer primary keys the prototype was written against, so `Number(postId)`
 * on a route param is now `NaN` — the conversions are gone, not relaxed.
 */

import { athleteApiBase } from "@/lib/bridge";

/*
 * The bridge is **same-origin**, reachable under this prefix on the app's own
 * origin. That is not cosmetic: these calls run in the browser, so an absolute
 * cross-origin base would need CORS *and* a second public FastAPI origin —
 * and a private server-only Service Binding, which the plan previously
 * specified, is unreachable from a browser altogether (§2.0).
 *
 * Who serves the prefix depends on the environment, and neither is this file's
 * concern:
 *   · production — a platform rewrite in `vercel.json` (Phase 2 step 11)
 *   · development — a `next.config.ts` rewrite to the local uvicorn
 * When the Route Handlers land, the prefix becomes `/api` and the rewrites go.
 */
export { BRIDGE_PREFIX } from "@/lib/bridge";

/*
 * `NEXT_PUBLIC_API_URL` remains only as an escape hatch for pointing a local
 * build at a remote bridge. Setting it re-introduces cross-origin requests, so
 * that bridge must then send CORS headers for this origin.
 */
const BASE = athleteApiBase(process.env.NEXT_PUBLIC_API_URL);

const TOKEN_KEY = "tm_access_token";
const USER_KEY = "tm_user";

/*
 * Client components still prerender on the server, where `localStorage` does
 * not exist — the prototype never had to care because Vite only ever rendered
 * in a browser. Every accessor returns the signed-out value on the server and
 * the effects that consume them re-read once mounted.
 */
const browser = () => typeof window !== "undefined";

export const authStorage = {
    getToken: () => (browser() ? localStorage.getItem(TOKEN_KEY) : null),
    setToken: (t: string) => {
        if (browser()) localStorage.setItem(TOKEN_KEY, t);
    },
    getUser: (): ApiUser | null => {
        if (!browser()) return null;
        const raw = localStorage.getItem(USER_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as ApiUser;
        } catch {
            return null; // corrupted state → treat as signed out
        }
    },
    setUser: (u: unknown) => {
        if (browser()) localStorage.setItem(USER_KEY, JSON.stringify(u));
    },
    clear: () => {
        if (!browser()) return;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },
};

export interface ApiUser {
    id: string;
    email: string | null;
    display_name: string;
    school?: string | null;
    status?: string | null;
    headline?: string | null;
    verified: boolean;
}

async function request<T>(
    path: string,
    opts: RequestInit & { auth?: boolean } = {},
): Promise<T | null> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(opts.headers as Record<string, string>),
    };
    if (opts.auth !== false) {
        const token = authStorage.getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
    }
    try {
        const res = await fetch(`${BASE}${path}`, { ...opts, headers });
        if (!res.ok) {
            // 401 cleared by the auth context elsewhere; just signal failure here
            return null;
        }
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

export interface ApiCheckIn {
    id: string;
    date: string;
    prompt_id: string;
    option: string;
    journal?: string | null;
}

export interface ApiGamePlan {
    intake_done: boolean;
    skill_map: { skill: string; translation: string; origin: string }[];
    path_fit: { id: string; name: string; fit: string; rationale: string; meta: string }[];
    committed_path_id: string | null;
    weekly_actions: { id: string; kind: string; text: string }[];
    completed_action_ids: string[];
    day: number;
    streak: number;
    total_days: number;
    phase: { id: string; name: string };
    check_in_count: number;
}

export interface ApiForum {
    id: string;
    title: string;
    category: string;
    description: string;
    member_count: number;
    active_now: number;
    icon: string;
    path_id?: string;
    joined: boolean;
}

export interface ApiForumMembership {
    forum_id: string;
    joined: boolean;
    member_count: number;
}

export interface ApiPostSummary {
    id: string;
    forum_id: string;
    author_name: string;
    flair: string;
    title: string;
    body: string;
    upvotes: number;
    comment_count: number;
    time_ago: string;
}

export interface ApiComment {
    id: string;
    author_name: string;
    body: string;
    upvotes: number;
    time_ago: string;
    replies?: ApiComment[];
}

export interface ApiPost {
    id: string;
    forum_id: string;
    author_name: string;
    flair: string;
    title: string;
    body: string;
    upvotes: number;
    time_ago: string;
    comments: ApiComment[];
}

export const api = {
    /* ---------- Auth ---------- */
    register: (
        email: string,
        password: string,
        display_name: string,
        school?: string,
        status?: string,
    ) =>
        request<{ access_token: string; user: ApiUser }>("/auth/register", {
            method: "POST",
            auth: false,
            body: JSON.stringify({ email, password, display_name, school, status }),
        }),
    login: (email: string, password: string) =>
        request<{ access_token: string; user: ApiUser }>("/auth/login", {
            method: "POST",
            auth: false,
            body: JSON.stringify({ email, password }),
        }),
    /* Bumps `auth_version` server-side, so the token is dead everywhere — not
     * just cleared from this browser's localStorage. */
    logout: () => request<{ status: string }>("/auth/logout", { method: "POST" }),
    me: () => request<ApiUser>("/auth/me"),

    /* ---------- Check-in ---------- */
    todaysCheckIn: () => request<ApiCheckIn | null>("/check-ins/today"),
    checkInHistory: () => request<ApiCheckIn[]>("/check-ins"),
    submitCheckIn: (promptId: string, question: string, option: string, journal?: string) =>
        request("/check-ins", {
            method: "POST",
            body: JSON.stringify({
                prompt_id: promptId,
                prompt_question: question,
                option,
                journal,
            }),
        }),
    updateTodaysCheckIn: (option?: string, journal?: string) =>
        request<ApiCheckIn>("/check-ins/today", {
            method: "PATCH",
            body: JSON.stringify({ option, journal }),
        }),

    /* ---------- Game plan ---------- */
    getGamePlan: () => request<ApiGamePlan>("/game-plan"),
    submitIntake: (answers: Record<string, string>) =>
        request("/profile/intake", { method: "POST", body: JSON.stringify(answers) }),
    getProfile: () =>
        request<{
            user_id: string;
            intake_done: boolean;
            intake_answers: Record<string, string> | null;
            skill_map: { skill: string; translation: string; origin: string }[];
        }>("/profile"),
    updateProfile: (patch: {
        display_name?: string;
        school?: string;
        status?: string;
        headline?: string;
    }) => request<ApiUser>("/profile", { method: "PATCH", body: JSON.stringify(patch) }),
    commitPath: (pathId: string | null) =>
        request("/game-plan/commit", { method: "POST", body: JSON.stringify({ path_id: pathId }) }),
    toggleAction: (actionId: string) =>
        request("/game-plan/actions/toggle", {
            method: "POST",
            body: JSON.stringify({ action_id: actionId }),
        }),

    /* ---------- Clipboard ---------- */
    clipboardHistory: () =>
        request<{ messages: { id: string; role: string; text: string; persona: string }[] }>(
            "/clipboard/history",
        ),
    clipboardChat: (message: string, persona: string) =>
        request<{ id: string; role: string; text: string; options?: string[] }>(
            "/clipboard/chat",
            { method: "POST", body: JSON.stringify({ message, persona }) },
        ),
    clipboardClear: () =>
        request<{ cleared: number }>("/clipboard/history", { method: "DELETE" }),

    /* ---------- Community ---------- */
    getForums: () => request<ApiForum[]>("/community/forums"),
    getCommunityFeed: (scope: "joined" | "all" = "joined", sort = "hot") =>
        request<ApiPostSummary[]>(`/community/feed?scope=${scope}&sort=${sort}`),
    setForumMembership: (forumId: string, joined: boolean) =>
        request<ApiForumMembership>(`/community/forums/${forumId}/membership`, {
            method: joined ? "POST" : "DELETE",
        }),
    getPosts: (forumId: string, sort = "hot") =>
        request<ApiPostSummary[]>(`/community/forums/${forumId}/posts?sort=${sort}`),
    createPost: (forumId: string, flair: string, title: string, body: string) =>
        request<ApiPostSummary>(`/community/forums/${forumId}/posts`, {
            method: "POST",
            body: JSON.stringify({ flair, title, body }),
        }),
    getPost: (postId: string) => request<ApiPost>(`/community/posts/${postId}`),
    addComment: (postId: string, body: string, parentId?: string) =>
        request(`/community/posts/${postId}/comments`, {
            method: "POST",
            body: JSON.stringify({ body, parent_id: parentId ?? null }),
        }),
    vote: (targetType: "post" | "comment", targetId: string) =>
        request<{ upvotes: number; voted: boolean }>("/community/vote", {
            method: "POST",
            body: JSON.stringify({ target_type: targetType, target_id: targetId, value: 1 }),
        }),

    /* ---------- Support / artifacts ---------- */
    artifacts: () => request<{ id: string; unlocked: boolean; title: string }[]>("/artifacts"),
    peerSupport: () =>
        request<{ status: string; message: string }>("/support/peer", { method: "POST" }),
    techSupport: (message: string) =>
        request<{ status: string; message: string }>("/support/tech", {
            method: "POST",
            body: JSON.stringify({ message }),
        }),
};
