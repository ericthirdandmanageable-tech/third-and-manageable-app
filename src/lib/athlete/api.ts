/*
 * API client for the Third & Manageable Next.js Route Handlers.
 * Every call returns null on network/HTTP failure so callers can show explicit
 * empty or unavailable states without leaking transport concerns into pages.
 *
 * Every endpoint is typed here and nowhere else.
 *
 * IDs on the wire are opaque Appwrite or Firestore strings. Never parse them
 * as numbers or assume UUID formatting.
 */

const BASE = "/api";

const SESSION_HINT_KEY = "tm_appwrite_session_hint";
const RETIRED_TOKEN_KEY = "tm_access_token";
const USER_KEY = "tm_user";

/*
 * Client components still prerender on the server, where `localStorage` does
 * not exist — the prototype never had to care because Vite only ever rendered
 * in a browser. Every accessor returns the signed-out value on the server and
 * the effects that consume them re-read once mounted.
 */
const browser = () => typeof window !== "undefined";

export const authStorage = {
    // This is only a rendering hint. The credential is an HttpOnly Appwrite
    // cookie and cannot be read by JavaScript.
    getToken: () =>
        browser()
            ? localStorage.getItem(SESSION_HINT_KEY) || localStorage.getItem(RETIRED_TOKEN_KEY)
            : null,
    setToken: (value: string) => {
        void value;
        if (browser()) localStorage.setItem(SESSION_HINT_KEY, "1");
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
        localStorage.removeItem(SESSION_HINT_KEY);
        localStorage.removeItem(RETIRED_TOKEN_KEY);
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
    verification_requested?: boolean;
    verification_requested_at?: string | null;
}

export interface ApiMutationResult {
    ok: boolean;
    message: string;
}

export interface ApiOnboardingAnswers {
    athlete_status: "current" | "former";
    sport: string;
    display_name: string;
    school: string;
    group_interest: boolean;
}

async function authenticatedMutation(
    path: string,
    body: Record<string, unknown>,
): Promise<ApiMutationResult> {
    if (!authStorage.getToken()) return { ok: false, message: "Sign in to continue." };
    try {
        const response = await fetch(`${BASE}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(body),
        });
        const payload = (await response.json().catch(() => ({}))) as {
            message?: string;
            detail?: string;
        };
        return {
            ok: response.ok,
            message:
                payload.message ||
                payload.detail ||
                (response.ok ? "Request sent." : "We could not send that request."),
        };
    } catch {
        return { ok: false, message: "Network unavailable. Please try again." };
    }
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
        // The HttpOnly Appwrite session cookie is sent automatically.
    }
    try {
        const res = await fetch(`${BASE}${path}`, {
            ...opts,
            headers,
            credentials: "same-origin",
        });
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

export interface ApiNotification {
    id: string;
    user_id: string;
    type: "checkin" | "streak" | "gameplan" | "milestone" | "welcome" | "mention";
    title: string;
    body: string;
    icon: string;
    timestamp: string;
    read: boolean;
    related_id?: string;
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
    requestUniversityVerification: (email: string) =>
        authenticatedMutation("/verification/university-email", { email }),
    requestManualVerification: (reasonCategory: string, reason?: string) =>
        authenticatedMutation("/verification/manual", {
            reason_category: reasonCategory,
            reason,
        }),

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
    submitOnboarding: (answers: ApiOnboardingAnswers) =>
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
        school_id?: string;
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

    /* ---------- Notifications ---------- */
    notifications: (limit = 50) =>
        request<ApiNotification[]>(`/notifications?limit=${Math.min(Math.max(limit, 1), 100)}`),
    markNotificationRead: (notificationId: string) =>
        request<{ updated: number }>("/notifications", {
            method: "PATCH",
            body: JSON.stringify({ notification_id: notificationId }),
        }),
    markAllNotificationsRead: () =>
        request<{ updated: number }>("/notifications", {
            method: "PATCH",
            body: JSON.stringify({ mark_all: true }),
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
    deleteAccount: () => request<{ status: "deleted" }>("/account", { method: "DELETE" }),
};
