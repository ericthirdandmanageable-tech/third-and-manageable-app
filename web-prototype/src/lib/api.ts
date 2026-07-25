/*
 * API client for the Third & Manageable backend (FastAPI, REDESIGN_BRIEF §15).
 * Every call returns null on network/HTTP failure so callers can gracefully
 * fall back to the local placeholder registries — the prototype stays fully
 * walkable offline, and live whenever the backend is reachable.
 */

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';

const TOKEN_KEY = 'tm_access_token';
const USER_KEY = 'tm_user';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  getUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (u: unknown) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export interface ApiUser {
  id: number;
  email: string;
  display_name: string;
  school?: string | null;
  status?: string | null;
  headline?: string | null;
  verified: boolean;
}

async function request<T>(path: string, opts: RequestInit & { auth?: boolean } = {}): Promise<T | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string>) };
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

/* ---------- Auth ---------- */
export const api = {
  register: (email: string, password: string, display_name: string, school?: string, status?: string) =>
    request<{ access_token: string; user: ApiUser }>('/auth/register', {
      method: 'POST', auth: false, body: JSON.stringify({ email, password, display_name, school, status }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string; user: ApiUser }>('/auth/login', {
      method: 'POST', auth: false, body: JSON.stringify({ email, password }),
    }),
  me: () => request<ApiUser>('/auth/me'),

  /* ---------- Check-in ---------- */
  todaysCheckIn: () => request<{ id: number; date: string; prompt_id: string; option: string; journal?: string } | null>('/check-ins/today'),
  checkInHistory: () =>
    request<{ id: number; date: string; prompt_id: string; option: string; journal?: string | null }[]>('/check-ins'),
  submitCheckIn: (promptId: string, question: string, option: string, journal?: string) =>
    request('/check-ins', {
      method: 'POST',
      body: JSON.stringify({ prompt_id: promptId, prompt_question: question, option, journal }),
    }),
  updateTodaysCheckIn: (option?: string, journal?: string) =>
    request<{ id: number; date: string; prompt_id: string; option: string; journal?: string | null }>('/check-ins/today', {
      method: 'PATCH',
      body: JSON.stringify({ option, journal }),
    }),

  /* ---------- Game plan ---------- */
  getGamePlan: () => request<{
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
  }>('/game-plan'),
  submitIntake: (answers: Record<string, string>) =>
    request('/profile/intake', { method: 'POST', body: JSON.stringify(answers) }),
  getProfile: () =>
    request<{ user_id: number; intake_done: boolean; intake_answers: Record<string, string> | null; skill_map: { skill: string; translation: string; origin: string }[] }>('/profile'),
  updateProfile: (patch: { display_name?: string; school?: string; status?: string; headline?: string }) =>
    request<ApiUser>('/profile', { method: 'PATCH', body: JSON.stringify(patch) }),
  commitPath: (pathId: string | null) =>
    request('/game-plan/commit', { method: 'POST', body: JSON.stringify({ path_id: pathId }) }),
  toggleAction: (actionId: string) =>
    request('/game-plan/actions/toggle', { method: 'POST', body: JSON.stringify({ action_id: actionId }) }),

  /* ---------- Clipboard ---------- */
  clipboardHistory: () => request<{ messages: { id: number; role: string; text: string; persona: string }[] }>('/clipboard/history'),
  clipboardChat: (message: string, persona: string) =>
    request<{ id: number; role: string; text: string; options?: string[] }>('/clipboard/chat', {
      method: 'POST', body: JSON.stringify({ message, persona }),
    }),
  clipboardClear: () => request<{ cleared: number }>('/clipboard/history', { method: 'DELETE' }),

  /* ---------- Community ---------- */
  getForums: () => request<{
    id: string; title: string; category: string; description: string;
    member_count: number; active_now: number; icon: string; path_id?: string;
  }[]>('/community/forums'),
  getPosts: (forumId: string, sort = 'hot') =>
    request<{ id: number; forum_id: string; author_name: string; flair: string; title: string; body: string; upvotes: number; comment_count: number; time_ago: string }[]>(
      `/community/forums/${forumId}/posts?sort=${sort}`,
    ),
  createPost: (forumId: string, flair: string, title: string, body: string) =>
    request('/community/forums/' + forumId + '/posts', {
      method: 'POST', body: JSON.stringify({ flair, title, body }),
    }),
  getPost: (postId: number) => request<{
    id: number; forum_id: string; author_name: string; flair: string; title: string;
    body: string; upvotes: number; time_ago: string;
    comments: { id: number; author_name: string; body: string; upvotes: number; time_ago: string; replies?: unknown[] }[];
  }>(`/community/posts/${postId}`),
  addComment: (postId: number, body: string, parentId?: number) =>
    request('/community/posts/' + postId + '/comments', {
      method: 'POST', body: JSON.stringify({ body, parent_id: parentId ?? null }),
    }),
  vote: (targetType: 'post' | 'comment', targetId: number) =>
    request<{ upvotes: number; voted: boolean }>('/community/vote', {
      method: 'POST', body: JSON.stringify({ target_type: targetType, target_id: targetId, value: 1 }),
    }),

  /* ---------- Support / artifacts ---------- */
  artifacts: () => request<{ id: string; unlocked: boolean; title: string }[]>('/artifacts'),
  peerSupport: () => request<{ status: string; message: string }>('/support/peer', { method: 'POST' }),
  techSupport: (message: string) =>
    request<{ status: string; message: string }>('/support/tech', {
      method: 'POST', body: JSON.stringify({ message }),
    }),
};