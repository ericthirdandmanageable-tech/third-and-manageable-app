"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowBigUp,
    ChevronLeft,
    Clock,
    Flame,
    MessageSquare,
    Plus,
    Trophy,
} from "lucide-react";
import clsx from "clsx";

import { Icon } from "@/components/athlete/icons";
import { api, type ApiForum } from "@/lib/athlete/api";
import { useAuth } from "@/lib/athlete/auth";
import { takeDraft, type ForumDraft } from "@/lib/athlete/forum-draft";
import {
    CATEGORY_STYLES,
    FLAIR_STYLES,
    type ForumCategory,
    type ForumPost,
    type PostFlair,
} from "@/lib/core/community";

type Sort = "hot" | "new" | "top";

/* Rough "hours ago" for relative-time strings ("3h", "1d") — only used for
 * the offline fallback data; the backend sorts its own rows. */
const hoursAgo = (t: string) => {
    const n = parseInt(t, 10);
    if (Number.isNaN(n)) return 0;
    if (t.endsWith("d")) return n * 24;
    if (t.endsWith("w")) return n * 168;
    return n;
};

/** Posts for a forum, or null when the request fails (offline fallback stays). */
const loadPosts = async (forumId: string, sort: Sort): Promise<ForumPost[] | null> => {
    if (!forumId) return null;
    const remote = await api.getPosts(forumId, sort);
    return remote
        ? remote.map((p) => ({
              id: p.id,
              threadId: p.forum_id,
              author: p.author_name,
              flair: p.flair as PostFlair,
              title: p.title,
              body: p.body,
              upvotes: p.upvotes,
              commentCount: p.comment_count,
              timeAgo: p.time_ago,
          }))
        : null;
};

const sortTabs: { id: Sort; label: string; icon: typeof Flame }[] = [
    { id: "hot", label: "Hot", icon: Flame },
    { id: "new", label: "New", icon: Clock },
    { id: "top", label: "Top", icon: Trophy },
];

export default function ForumPage() {
    const { threadId } = useParams<{ threadId: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const [sort, setSort] = useState<Sort>("hot");
    const [forum, setForum] = useState<ApiForum | null>(null);
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [draft, setDraft] = useState<ForumDraft | null>(null);
    const [composing, setComposing] = useState(false);

    const fetchPosts = useCallback(
        async (s: Sort) => {
            const rows = await loadPosts(threadId, s);
            if (rows) setPosts(rows);
        },
        [threadId],
    );

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [remoteForums, rows] = await Promise.all([
                api.getForums(),
                loadPosts(threadId, sort),
            ]);
            if (cancelled) return;
            setForum(remoteForums?.find((candidate) => candidate.id === threadId) ?? null);
            if (rows) setPosts(rows);
            else setPosts([]);
            setLoadFailed(!remoteForums || rows === null);
            setLoading(false);

            /* An artifact's "Share to forum" hands the draft over in
             * sessionStorage (see lib/athlete/forum-draft). It is read here,
             * after mount, because there is no sessionStorage during the
             * server render; `takeDraft` clears it, so re-running this effect
             * on a sort change cannot reopen a composer the athlete closed. */
            const pending = takeDraft(threadId);
            if (pending) {
                setDraft(pending);
                setComposing(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [threadId, sort, user]);

    const sorted = [...posts].sort((a, b) => {
        if (sort === "top") return b.upvotes - a.upvotes;
        if (sort === "new") return hoursAgo(a.timeAgo) - hoursAgo(b.timeAgo);
        return b.upvotes + b.commentCount - (a.upvotes + a.commentCount); // hot
    });
    const contributorCount = new Set(posts.map((post) => post.author)).size;

    if (loading) {
        return (
            <div className="p-10 text-center font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
                Loading community…
            </div>
        );
    }

    if (!forum || !threadId) {
        return (
            <div className="p-6 md:p-10 max-w-3xl mx-auto text-center pt-24 animate-rise">
                <h1 className="font-serif text-3xl text-sand italic mb-3">Community not found</h1>
                <p className="text-[14px] text-text-secondary mb-6">
                    That forum doesn&apos;t exist — it may have been renamed.
                </p>
                <button
                    onClick={() => router.push("/community")}
                    className="text-volt text-[14px] hover:underline underline-offset-4"
                >
                    Browse all communities
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 max-w-3xl mx-auto animate-rise">
            <button
                onClick={() => router.push("/community")}
                className="flex items-center gap-1 text-text-tertiary hover:text-text-primary text-[13px] mb-6 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" /> All communities
            </button>
            <header className="mb-6">
                <div className="flex items-center gap-4 mb-2">
                    <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${CATEGORY_STYLES[forum.category as ForumCategory]?.tile ?? "bg-volt/10 text-volt"}`}
                    >
                        <Icon name={forum.icon} className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-serif text-3xl text-sand italic">{forum.title}</h1>
                        <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">
                            <span className="text-volt">{contributorCount} contributors</span> ·{" "}
                            {posts.length} conversations
                        </p>
                    </div>
                </div>
                <p className="text-[13px] text-text-secondary mt-2">{forum.description}</p>
                <div className="yard-line mt-4" />
            </header>

            {/* Compose */}
            {user ? (
                !composing ? (
                    <button
                        onClick={() => setComposing(true)}
                        className="flex items-center gap-2 text-[13px] text-volt bg-volt/10 px-4 py-2 rounded-full mb-6 hover:bg-volt/20 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Share a post
                    </button>
                ) : (
                    <Composer
                        forumId={threadId}
                        initial={draft ?? undefined}
                        onDone={() => {
                            setComposing(false);
                            setDraft(null);
                            fetchPosts(sort);
                        }}
                        onCancel={() => {
                            setComposing(false);
                            setDraft(null);
                        }}
                    />
                )
            ) : (
                <p className="text-[13px] text-text-tertiary mb-6">
                    Sign in to post — verified athletes only.
                </p>
            )}

            {/* Sort */}
            <div className="flex gap-1 bg-bg-surface border border-border-subtle rounded-full p-1 w-fit mb-6">
                {sortTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setSort(tab.id)}
                        aria-pressed={sort === tab.id}
                        className={clsx(
                            "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium transition-all",
                            sort === tab.id
                                ? "bg-volt text-volt-ink"
                                : "text-text-secondary hover:text-text-primary",
                        )}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Posts */}
            {sorted.length === 0 ? (
                <div className="bg-bg-surface rounded-2xl border border-border-subtle p-8 text-center">
                    <p className="font-serif text-xl text-sand italic mb-2">
                        {loadFailed ? "Community unavailable" : "Quiet in here"}
                    </p>
                    <p className="text-[14px] text-text-secondary">
                        {loadFailed
                            ? "No demo posts were substituted. Reconnect the Services bridge and try again."
                            : "No posts yet — the first one usually breaks the ice for everyone."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sorted.map((post) => (
                        <button
                            key={post.id}
                            onClick={() => router.push(`/community/${threadId}/${post.id}`)}
                            className="w-full text-left bg-bg-surface rounded-2xl border border-border-subtle p-5 hover:border-volt/50 hover:bg-bg-elevated transition-all duration-200 group"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span
                                    className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${FLAIR_STYLES[post.flair]}`}
                                >
                                    {post.flair}
                                </span>
                                <span className="font-mono text-[11px] text-text-tertiary">
                                    {post.author} · {post.timeAgo}
                                </span>
                            </div>
                            <h3 className="text-[17px] font-semibold text-text-primary mb-1 group-hover:text-volt transition-colors">
                                {post.title}
                            </h3>
                            <p className="text-[13px] text-text-secondary line-clamp-2 mb-3">
                                {post.body}
                            </p>
                            <div className="flex items-center gap-4 font-mono text-[11px] text-text-tertiary">
                                <span className="flex items-center gap-1">
                                    <ArrowBigUp className="w-4 h-4" /> {post.upvotes}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MessageSquare className="w-3.5 h-3.5" /> {post.commentCount}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

const FLAIRS: PostFlair[] = ["WIN", "VENT", "QUESTION", "RESOURCE", "MILESTONE"];

const Composer = ({
    forumId,
    initial,
    onDone,
    onCancel,
}: {
    forumId: string;
    initial?: { title: string; body: string };
    onDone: () => void;
    onCancel: () => void;
}) => {
    const [flair, setFlair] = useState<PostFlair>(initial ? "MILESTONE" : "WIN");
    const [title, setTitle] = useState(initial?.title ?? "");
    const [body, setBody] = useState(initial?.body ?? "");
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (!title.trim() || !body.trim()) return;
        setBusy(true);
        const res = await api.createPost(forumId, flair, title.trim(), body.trim());
        setBusy(false);
        if (res) onDone();
    };

    return (
        <div className="bg-bg-surface rounded-2xl border border-border-subtle p-5 mb-6 animate-disclosure">
            <div className="flex flex-wrap gap-2 mb-3">
                {FLAIRS.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFlair(f)}
                        aria-pressed={flair === f}
                        className={clsx(
                            "font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full transition-all",
                            flair === f ? FLAIR_STYLES[f] : "bg-bg-elevated text-text-tertiary",
                        )}
                    >
                        {f}
                    </button>
                ))}
            </div>
            <input
                placeholder="Title"
                aria-label="Post title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt mb-2"
            />
            <textarea
                placeholder="What's on your mind?"
                aria-label="Post body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full h-24 bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt resize-none mb-3"
            />
            <div className="flex gap-2">
                <button
                    onClick={submit}
                    disabled={busy}
                    className="bg-volt text-volt-ink font-semibold px-5 py-2 rounded-full text-[14px] hover:bg-volt/90 disabled:opacity-50 transition-all"
                >
                    {busy ? "Posting…" : "Post"}
                </button>
                <button
                    onClick={onCancel}
                    className="px-5 py-2 rounded-full text-[14px] text-text-tertiary hover:text-text-secondary transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};
