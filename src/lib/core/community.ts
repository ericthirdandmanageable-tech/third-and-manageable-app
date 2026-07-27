/*
 * COMMUNITY REGISTRY — product taxonomy and route metadata.
 * Path forums are DERIVED from the WORK_PATHS registry: adding a path in
 * `./paths` automatically creates its forum here. Other forums (Local /
 * Sport / Support) are standalone entries below.
 *
 * Mirrors `backend/app/routes/community.py::seed_forums`. Icons are lucide
 * names — see the note in `./paths`.
 */

import { WORK_PATHS } from "./paths";

export type ForumCategory = "Local" | "Sport" | "Support" | "Path";

export interface ForumThread {
    id: string;
    title: string;
    category: ForumCategory;
    memberCount: number;
    activeNow: number;
    icon: string;
    description: string;
    pathId?: string; // set for Path forums — links back to the work path
}

/* Derived: one forum per work path */
const pathForums: ForumThread[] = WORK_PATHS.map((path) => ({
    id: `path-${path.id}`,
    title: path.forum.title,
    category: "Path",
    memberCount: path.forum.memberCount,
    activeNow: path.forum.activeNow,
    icon: path.icon,
    description: path.forum.description,
    pathId: path.id,
}));

/* Standalone forums */
const communityForums: ForumThread[] = [
    { id: "local-davis-soccer", title: "UC Davis - Pick-up Soccer", category: "Local", memberCount: 0, activeNow: 0, icon: "MapPin", description: "Casual games, zero tryouts." },
    { id: "local-nyc-swimmers", title: "Former Swimmers in NYC", category: "Local", memberCount: 0, activeNow: 0, icon: "MapPin", description: "Lane mates turned city network." },
    { id: "support-acl", title: "ACL Recovery Support", category: "Support", memberCount: 0, activeNow: 0, icon: "ShieldAlert", description: "Rehab is a season too." },
    { id: "support-stories", title: "Transition Stories", category: "Support", memberCount: 0, activeNow: 0, icon: "Trophy", description: "How you got through it — or how you are." },
];

export const FORUMS: ForumThread[] = [...pathForums, ...communityForums];

export const getForum = (id: string | undefined) =>
    FORUMS.find((f) => f.id === id);

/* Category display order for the directory */
export const FORUM_CATEGORIES: { id: ForumCategory; label: string }[] = [
    { id: "Path", label: "Work Paths" },
    { id: "Support", label: "Support" },
    { id: "Local", label: "Local" },
    { id: "Sport", label: "Sport" },
];

export type PostFlair = "WIN" | "VENT" | "QUESTION" | "RESOURCE" | "MILESTONE";

export interface ForumPost {
    id: string;
    threadId: string;
    author: string;
    flair: PostFlair;
    title: string;
    body: string;
    upvotes: number;
    commentCount: number;
    timeAgo: string;
}

export interface ForumComment {
    id: string;
    author: string;
    text: string;
    upvotes: number;
    timeAgo: string;
    replies?: ForumComment[];
}

export const FLAIR_STYLES: Record<PostFlair, string> = {
    WIN: "bg-volt/10 text-volt",
    VENT: "bg-hrv/10 text-hrv",
    QUESTION: "bg-sleep/10 text-sleep",
    RESOURCE: "bg-activity/10 text-activity",
    MILESTONE: "bg-sand/10 text-sand",
};

export const CATEGORY_STYLES: Record<ForumCategory, { tile: string; label: string }> = {
    Local: { tile: "bg-sleep/10 text-sleep", label: "Local" },
    Sport: { tile: "bg-activity/10 text-activity", label: "Sport" },
    Support: { tile: "bg-hrv/10 text-hrv", label: "Support" },
    Path: { tile: "bg-volt/10 text-volt", label: "Path" },
};
