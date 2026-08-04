"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
    Bookmark,
    BriefcaseBusiness,
    Check,
    CheckCircle2,
    ChevronRight,
    CircleHelp,
    Compass,
    Flame,
    Heart,
    HeartHandshake,
    MessageCircle,
    Plus,
    Send,
    ShieldCheck,
    Sparkles,
    Trophy,
    Users,
} from "lucide-react";
import clsx from "clsx";

import { Icon } from "@/components/athlete/icons";
import {
    api,
    type ApiForum,
    type ApiPostSummary,
} from "@/lib/athlete/api";
import { useAuth } from "@/lib/athlete/auth";
import { getCommunityTheme } from "@/lib/core/community-theme";

const TOPICS = [
    { id: "all", label: "Athlete Stories", icon: Trophy },
    { id: "wellness", label: "Mental Wellness", icon: HeartHandshake },
    { id: "career", label: "Careers & Business", icon: BriefcaseBusiness },
    { id: "goals", label: "Life Goals", icon: Sparkles },
    { id: "question", label: "Ask the Community", icon: CircleHelp },
    { id: "wins", label: "Wins This Week", icon: Flame },
] as const;

type TopicId = (typeof TOPICS)[number]["id"];
type Flair = "WIN" | "VENT" | "QUESTION" | "RESOURCE" | "MILESTONE";
type FeedScope = "joined" | "all";
type FeedSort = "hot" | "new" | "top";

const FEED_SORTS: { id: FeedSort; label: string }[] = [
    { id: "hot", label: "Hot" },
    { id: "new", label: "Latest" },
    { id: "top", label: "Top" },
];

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "TM";

const isPostVisible = (
    post: ApiPostSummary,
    topic: TopicId,
    forumById: Map<string, ApiForum>,
) => {
    if (topic === "all") return true;
    if (topic === "wellness") {
        return post.flair === "VENT" || forumById.get(post.forum_id)?.category === "Support";
    }
    if (topic === "career") return forumById.get(post.forum_id)?.category === "Path";
    if (topic === "goals") return post.flair === "MILESTONE";
    if (topic === "question") return post.flair === "QUESTION";
    return post.flair === "WIN";
};

export default function CommunityPage() {
    const router = useRouter();
    const { user } = useAuth();
    const theme = getCommunityTheme(user?.school);
    const chatVariant = theme.key !== "tm";
    const [forums, setForums] = useState<ApiForum[]>([]);
    const [posts, setPosts] = useState<ApiPostSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [topic, setTopic] = useState<TopicId>("all");
    const [feedScope, setFeedScope] = useState<FeedScope>("joined");
    const [feedSort, setFeedSort] = useState<FeedSort>("hot");
    const [feedRevision, setFeedRevision] = useState(0);
    const [membershipBusy, setMembershipBusy] = useState<string | null>(null);
    const [membershipError, setMembershipError] = useState("");
    const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
    const [liked, setLiked] = useState<Set<string>>(new Set());
    const [composerOpen, setComposerOpen] = useState(false);
    const [posting, setPosting] = useState(false);
    const [postError, setPostError] = useState("");
    const [draft, setDraft] = useState({
        forumId: "",
        flair: "QUESTION" as Flair,
        title: "",
        body: "",
    });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setLoadFailed(false);
            const remoteForums = await api.getForums();
            if (cancelled) return;
            if (!remoteForums) {
                setForums([]);
                setPosts([]);
                setLoadFailed(true);
                setLoading(false);
                return;
            }

            setForums(remoteForums);
            setDraft((current) => ({
                ...current,
                forumId: current.forumId || remoteForums[0]?.id || "",
            }));
            const hasMemberships = remoteForums.some((forum) => forum.joined);
            const resolvedScope =
                feedScope === "joined" && !hasMemberships ? "all" : feedScope;
            if (resolvedScope !== feedScope) setFeedScope(resolvedScope);
            const remotePosts = await api.getCommunityFeed(resolvedScope, feedSort);
            if (cancelled) return;
            setPosts(remotePosts ?? []);
            setLoadFailed(remotePosts === null);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [feedRevision, feedScope, feedSort, user?.id]);

    const forumById = useMemo(
        () => new Map(forums.map((forum) => [forum.id, forum])),
        [forums],
    );
    const visiblePosts = posts.filter((post) => isPostVisible(post, topic, forumById));
    const joinedCount = forums.filter((forum) => forum.joined).length;
    // Membership is real per forum, but summing those rows would double-count
    // athletes who joined more than one. Until a global distinct-member and
    // presence query exists, show observed participants plus this session.
    const memberCount = new Set([
        ...(user ? [user.display_name] : []),
        ...posts.map((post) => post.author_name),
    ]).size;
    const activeCount = user ? 1 : 0;

    const toggleBookmark = (postId: string) => {
        setBookmarked((current) => {
            const next = new Set(current);
            if (next.has(postId)) next.delete(postId);
            else next.add(postId);
            return next;
        });
    };

    const toggleLike = async (post: ApiPostSummary) => {
        const result = await api.vote("post", post.id);
        if (!result) return;
        setPosts((current) =>
            current.map((candidate) =>
                candidate.id === post.id
                    ? { ...candidate, upvotes: result.upvotes }
                    : candidate,
            ),
        );
        setLiked((current) => {
            const next = new Set(current);
            if (result.voted) next.add(post.id);
            else next.delete(post.id);
            return next;
        });
    };

    const toggleMembership = async (forum: ApiForum) => {
        if (membershipBusy) return;
        if (!user?.verified) {
            setMembershipError("Your athlete verification must be approved before you can join.");
            return;
        }
        const joining = !forum.joined;
        setMembershipBusy(forum.id);
        const result = await api.setForumMembership(forum.id, joining);
        setMembershipBusy(null);
        if (!result) {
            setMembershipError("That community could not be updated. Please try again.");
            return;
        }
        setMembershipError("");
        setForums((current) =>
            current.map((candidate) =>
                candidate.id === result.forum_id
                    ? {
                          ...candidate,
                          joined: result.joined,
                          member_count: result.member_count,
                      }
                    : candidate,
            ),
        );
        if (joining && joinedCount === 0) setFeedScope("joined");
        else if (!joining && joinedCount === 1 && feedScope === "joined") {
            setFeedScope("all");
        } else setFeedRevision((revision) => revision + 1);
    };

    const publish = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!draft.forumId || draft.title.trim().length < 3 || draft.body.trim().length < 3) {
            setPostError("Choose a community and add a title and message.");
            return;
        }
        setPosting(true);
        setPostError("");
        const created = await api.createPost(
            draft.forumId,
            draft.flair,
            draft.title.trim(),
            draft.body.trim(),
        );
        setPosting(false);
        if (!created) {
            setPostError(
                user?.verified
                    ? "That didn’t post. Check the connection and try again."
                    : "Your athlete verification must be approved before you can post.",
            );
            return;
        }
        setPosts((current) => [created, ...current]);
        setForums((current) =>
            current.map((forum) =>
                forum.id === created.forum_id && !forum.joined
                    ? { ...forum, joined: true, member_count: forum.member_count + 1 }
                    : forum,
            ),
        );
        setDraft((current) => ({ ...current, title: "", body: "" }));
        setComposerOpen(false);
        setFeedScope("joined");
        setFeedRevision((revision) => revision + 1);
    };

    const style = {
        "--community-primary": theme.primary,
        "--community-primary-dark": theme.primaryDark,
        "--community-accent": theme.accent,
        "--community-soft": theme.soft,
        "--community-text": theme.text,
    } as CSSProperties;

    return (
        <div
            style={style}
            className="relative min-h-full overflow-hidden bg-[#f6f7f9] text-[#111827] selection:bg-[var(--community-soft)]"
        >
            {chatVariant && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-[-4vw] top-[38rem] select-none text-[clamp(7rem,24vw,18rem)] font-black tracking-[-0.1em] opacity-[0.035]"
                    style={{ color: theme.primary }}
                >
                    {theme.initials}
                </div>
            )}
            <div className="relative z-10 mx-auto max-w-5xl px-4 pb-12 pt-5 sm:px-7 sm:pt-8 lg:px-10">
                <header>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-sm font-medium text-[#6b7280]">
                            <div
                                className="flex h-11 w-11 items-center justify-center rounded-full border-2 bg-white text-[10px] font-black shadow-sm"
                                style={{
                                    borderColor: theme.accent,
                                    color: theme.primary,
                                }}
                            >
                                {theme.initials}
                            </div>
                            <span>Community</span>
                        </div>
                        <button
                            onClick={() => router.push("/support")}
                            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5"
                            style={{
                                background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`,
                            }}
                        >
                            <ShieldCheck className="h-4 w-4" /> Need Support
                        </button>
                    </div>

                    <div className="mt-6">
                        <h1
                            className="text-[clamp(2rem,6vw,3.6rem)] font-black leading-[0.98] tracking-[-0.045em]"
                            style={{ color: theme.text }}
                        >
                            {theme.communityName}
                        </h1>
                        <p
                            className="mt-3 flex items-center gap-2 text-sm font-semibold sm:text-base"
                            style={{ color: theme.text }}
                        >
                            <CheckCircle2 className="h-4 w-4" style={{ color: theme.accent }} />
                            {theme.organizationName}
                        </p>
                        {theme.key === "tm" && (
                            <p className="mt-4 max-w-2xl text-[15px] leading-6 text-[#4b5563]">
                                A place where athletes connect, grow, and support one another through
                                every stage of life.
                            </p>
                        )}
                    </div>

                    <section
                        aria-label="Community stats"
                        className="mt-7 grid grid-cols-3 overflow-hidden rounded-[24px] px-2 py-5 text-white shadow-[0_14px_34px_rgba(15,23,42,0.14)] sm:px-5 sm:py-6"
                        style={{
                            background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`,
                        }}
                    >
                        {[
                            { value: memberCount, label: "Members", icon: Users },
                            { value: activeCount, label: "Active now", icon: Sparkles },
                            { value: posts.length, label: "Conversations", icon: MessageCircle },
                        ].map(({ value, label, icon: StatIcon }, index) => (
                            <div
                                key={label}
                                className={clsx(
                                    "flex min-w-0 flex-col items-center justify-center px-2 text-center sm:flex-row sm:gap-3",
                                    index > 0 && "border-l border-white/20",
                                )}
                            >
                                <StatIcon className="mb-1 h-5 w-5 text-white/75 sm:mb-0 sm:h-6 sm:w-6" />
                                <div>
                                    <p className="text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
                                    <p className="mt-0.5 text-[10px] leading-tight text-white/72 sm:text-xs">
                                        {label}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </section>
                </header>

                <section className="mt-8">
                    <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[#4b5563]">
                        Explore topics
                    </h2>
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap">
                        {TOPICS.map(({ id, label, icon: TopicIcon }) => (
                            <button
                                key={id}
                                onClick={() => setTopic(id)}
                                aria-pressed={topic === id}
                                className="inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-sm transition"
                                style={
                                    topic === id
                                        ? {
                                              borderColor: theme.primary,
                                              backgroundColor: theme.primary,
                                              color: "white",
                                          }
                                        : {
                                              borderColor: "#e5e7eb",
                                              backgroundColor: "white",
                                              color: "#1f2937",
                                          }
                                }
                            >
                                <TopicIcon
                                    className="h-4 w-4"
                                    style={topic === id ? undefined : { color: theme.accent }}
                                />
                                {label}
                            </button>
                        ))}
                    </div>
                </section>

                {forums.length > 0 && (
                    <section className="mt-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#4b5563]">
                                Find your communities
                            </p>
                            <span className="text-xs font-semibold text-[#6b7280]">
                                {joinedCount} joined
                            </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {forums.map((forum) => (
                                <div
                                    key={forum.id}
                                    className="inline-flex shrink-0 items-center overflow-hidden rounded-full border border-[#e5e7eb] bg-white text-xs font-medium text-[#4b5563] shadow-sm transition hover:border-[var(--community-primary)]"
                                >
                                    <button
                                        onClick={() => router.push(`/community/${forum.id}`)}
                                        className="inline-flex items-center gap-2 py-2 pl-3.5 pr-2 hover:text-[var(--community-text)]"
                                    >
                                        <Icon name={forum.icon} className="h-3.5 w-3.5" />
                                        {forum.title}
                                    </button>
                                    <button
                                        onClick={() => toggleMembership(forum)}
                                        disabled={membershipBusy === forum.id}
                                        aria-label={`${forum.joined ? "Leave" : "Join"} ${forum.title}`}
                                        aria-pressed={forum.joined}
                                        className="mr-1.5 flex h-7 w-7 items-center justify-center rounded-full transition disabled:opacity-50"
                                        style={
                                            forum.joined
                                                ? { backgroundColor: theme.soft, color: theme.primary }
                                                : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                                        }
                                    >
                                        {forum.joined ? (
                                            <Check className="h-3.5 w-3.5" />
                                        ) : (
                                            <Plus className="h-3.5 w-3.5" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                        {joinedCount === 0 && (
                            <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                                Join one or two communities to turn the conversation list into your feed.
                            </p>
                        )}
                        {membershipError && (
                            <p role="alert" className="mt-2 text-xs font-medium text-[#b42318]">
                                {membershipError}
                            </p>
                        )}
                    </section>
                )}

                <section
                    className="relative mt-6 overflow-hidden rounded-[24px] px-6 py-7 text-white shadow-[0_14px_30px_rgba(15,23,42,0.15)] sm:px-8"
                    style={{
                        background: `radial-gradient(circle at 92% 25%, ${theme.accent}55, transparent 35%), linear-gradient(135deg, ${theme.primaryDark}, ${theme.primary})`,
                    }}
                >
                    <div className="relative z-10 max-w-2xl">
                        <p
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em]"
                            style={{ color: theme.accent }}
                        >
                            <MessageCircle className="h-4 w-4" /> Today&apos;s chat prompt
                        </p>
                        <h2 className="mt-3 text-2xl font-bold leading-snug sm:text-3xl">
                            What&apos;s one thing you&apos;re working on right now—on or off the field?
                        </h2>
                        <p className="mt-3 text-sm text-white/76">
                            Share, support, and grow together.
                        </p>
                    </div>
                    <div
                        aria-hidden="true"
                        className="absolute -bottom-6 right-3 select-none text-7xl font-black tracking-[-0.08em] text-white/[0.055] sm:text-9xl"
                    >
                        {theme.initials}
                    </div>
                </section>

                <section className="mt-7">
                    <button
                        onClick={() => setComposerOpen((open) => !open)}
                        className="flex w-full items-center gap-3 rounded-[20px] border border-[#e5e7eb] bg-white p-3.5 text-left shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition hover:border-[var(--community-primary)]"
                    >
                        <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: theme.primary }}
                        >
                            {initials(user?.display_name ?? "TM")}
                        </span>
                        <span className="flex-1 text-sm text-[#9ca3af]">
                            Share something with the community…
                        </span>
                        <Send className="h-4 w-4" style={{ color: theme.primary }} />
                    </button>

                    {composerOpen && (
                        <form
                            onSubmit={publish}
                            className="mt-3 rounded-[20px] border border-[#e5e7eb] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-5"
                        >
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="text-xs font-semibold text-[#4b5563]">
                                    Community
                                    <select
                                        value={draft.forumId}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                forumId: event.target.value,
                                            }))
                                        }
                                        className="mt-1.5 w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[var(--community-primary)]"
                                    >
                                        {forums.map((forum) => (
                                            <option key={forum.id} value={forum.id}>
                                                {forum.title}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-xs font-semibold text-[#4b5563]">
                                    Post type
                                    <select
                                        value={draft.flair}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                flair: event.target.value as Flair,
                                            }))
                                        }
                                        className="mt-1.5 w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[var(--community-primary)]"
                                    >
                                        <option value="QUESTION">Question</option>
                                        <option value="WIN">Win</option>
                                        <option value="VENT">Vent</option>
                                        <option value="RESOURCE">Resource</option>
                                        <option value="MILESTONE">Milestone</option>
                                    </select>
                                </label>
                            </div>
                            <label htmlFor="community-post-title" className="sr-only">
                                Post title
                            </label>
                            <input
                                id="community-post-title"
                                value={draft.title}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        title: event.target.value,
                                    }))
                                }
                                placeholder="Give your post a short title"
                                className="mt-3 w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm font-semibold text-[#111827] outline-none placeholder:font-normal placeholder:text-[#9ca3af] focus:border-[var(--community-primary)]"
                            />
                            <label htmlFor="community-post-body" className="sr-only">
                                Post message
                            </label>
                            <textarea
                                id="community-post-body"
                                value={draft.body}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        body: event.target.value,
                                    }))
                                }
                                placeholder="What’s on your mind?"
                                className="mt-3 min-h-28 w-full resize-none rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm leading-6 text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[var(--community-primary)]"
                            />
                            {postError && (
                                <p role="alert" className="mt-2 text-sm text-[#b42318]">
                                    {postError}
                                </p>
                            )}
                            <div className="mt-3 flex items-center justify-between gap-3">
                                <p className="text-xs text-[#9ca3af]">
                                    {user?.verified ? "Verified athlete" : "Read-only until verified"}
                                </p>
                                <button
                                    type="submit"
                                    disabled={posting || !forums.length}
                                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-45"
                                    style={{ backgroundColor: theme.primary }}
                                >
                                    {posting ? "Posting…" : "Post"} <Send className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </form>
                    )}
                </section>

                <section className="mt-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[#4b5563]">
                            {feedScope === "joined" ? "Your community feed" : "Discover conversations"}
                        </h2>
                        <span className="text-xs font-semibold" style={{ color: theme.text }}>
                            {visiblePosts.length} {visiblePosts.length === 1 ? "post" : "posts"}
                        </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div
                            role="tablist"
                            aria-label="Community feed"
                            className="inline-flex rounded-full border border-[#e5e7eb] bg-white p-1 shadow-sm"
                        >
                            {([
                                { id: "joined" as const, label: "My communities", icon: Users },
                                { id: "all" as const, label: "Discover", icon: Compass },
                            ]).map(({ id, label, icon: FeedIcon }) => (
                                <button
                                    key={id}
                                    role="tab"
                                    aria-selected={feedScope === id}
                                    disabled={id === "joined" && joinedCount === 0}
                                    onClick={() => setFeedScope(id)}
                                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
                                    style={
                                        feedScope === id
                                            ? { backgroundColor: theme.primary, color: "white" }
                                            : { color: "#6b7280" }
                                    }
                                >
                                    <FeedIcon className="h-3.5 w-3.5" /> {label}
                                </button>
                            ))}
                        </div>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#6b7280]">
                            Sort
                            <select
                                value={feedSort}
                                onChange={(event) => setFeedSort(event.target.value as FeedSort)}
                                className="rounded-full border border-[#e5e7eb] bg-white px-3 py-2 text-xs font-semibold text-[#374151] outline-none focus:border-[var(--community-primary)]"
                            >
                                {FEED_SORTS.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {loading ? (
                        <div className="mt-3 rounded-[20px] border border-[#e5e7eb] bg-white p-8 text-center text-sm text-[#9ca3af]">
                            Loading the community…
                        </div>
                    ) : visiblePosts.length === 0 ? (
                        <div className="mt-3 rounded-[24px] border border-dashed border-[#d1d5db] bg-white px-6 py-10 text-center">
                            <div
                                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
                                style={{ backgroundColor: theme.soft, color: theme.primary }}
                            >
                                <MessageCircle className="h-5 w-5" />
                            </div>
                            <h3 className="mt-4 text-lg font-bold text-[#111827]">
                                {loadFailed
                                    ? "The feed is temporarily unavailable"
                                    : feedScope === "joined"
                                      ? "Your communities are quiet right now"
                                      : "Start the first conversation"}
                            </h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6b7280]">
                                {loadFailed
                                    ? "No sample posts were substituted. Reconnect the Services bridge and this feed will load real conversations."
                                    : feedScope === "joined"
                                      ? "Try Discover, join another community, or start a conversation where you already belong."
                                      : "There are no posts in this topic yet. Share a question, a win, or the thing you’re working through."}
                            </p>
                            {!loadFailed && (
                                <button
                                    onClick={() => setComposerOpen(true)}
                                    className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                                    style={{ backgroundColor: theme.primary }}
                                >
                                    Write the first post <ChevronRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="mt-3 space-y-3">
                            {visiblePosts.map((post) => (
                                <article
                                    key={post.id}
                                    className={clsx(
                                        chatVariant
                                            ? "rounded-[22px] px-1 py-3"
                                            : "rounded-[22px] border border-[#e5e7eb] bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.055)]",
                                    )}
                                >
                                    <button
                                        onClick={() =>
                                            router.push(`/community/${post.forum_id}/${post.id}`)
                                        }
                                        className="w-full text-left"
                                    >
                                        <div className="flex items-start gap-3">
                                            <span
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                                style={{ backgroundColor: theme.primary }}
                                            >
                                                {initials(post.author_name)}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="truncate text-sm font-bold text-[#111827]">
                                                        {post.author_name}
                                                    </p>
                                                    <CheckCircle2
                                                        className="h-3.5 w-3.5"
                                                        style={{ color: theme.accent }}
                                                    />
                                                    <span className="ml-auto text-xs text-[#9ca3af]">
                                                        {post.time_ago}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-xs text-[#6b7280]">
                                                    {post.flair.toLowerCase()} ·{" "}
                                                    {forumById.get(post.forum_id)?.title ?? "Community"}
                                                </p>
                                            </div>
                                        </div>
                                        <div
                                            className={clsx(
                                                chatVariant &&
                                                    "relative ml-[52px] mt-3 rounded-[18px] bg-white px-5 py-4 shadow-[0_9px_24px_rgba(15,23,42,0.09)] before:absolute before:-top-1.5 before:left-5 before:h-3 before:w-3 before:rotate-45 before:bg-white",
                                            )}
                                        >
                                            <h3
                                                className={clsx(
                                                    "text-[17px] font-bold leading-snug text-[#111827]",
                                                    !chatVariant && "mt-4",
                                                )}
                                            >
                                                {post.title}
                                            </h3>
                                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#374151]">
                                                {post.body}
                                            </p>
                                        </div>
                                    </button>
                                    <div
                                        className={clsx(
                                            "flex items-center gap-5",
                                            chatVariant
                                                ? "ml-[52px] mt-2 px-2 py-1"
                                                : "mt-4 border-t border-[#f0f1f3] pt-3",
                                        )}
                                    >
                                        <button
                                            onClick={() => toggleLike(post)}
                                            className="inline-flex items-center gap-1.5 text-sm font-medium"
                                            style={{ color: liked.has(post.id) ? theme.accent : "#6b7280" }}
                                            aria-label={`${liked.has(post.id) ? "Unlike" : "Like"} ${post.title}`}
                                        >
                                            <Heart
                                                className={clsx(
                                                    "h-4 w-4",
                                                    liked.has(post.id) && "fill-current",
                                                )}
                                            />
                                            {post.upvotes}
                                        </button>
                                        <button
                                            onClick={() =>
                                                router.push(`/community/${post.forum_id}/${post.id}`)
                                            }
                                            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6b7280]"
                                            aria-label={`View ${post.comment_count} comments on ${post.title}`}
                                        >
                                            <MessageCircle className="h-4 w-4" /> {post.comment_count}
                                        </button>
                                        <button
                                            onClick={() => toggleBookmark(post.id)}
                                            className="ml-auto text-[#6b7280]"
                                            aria-label={`${bookmarked.has(post.id) ? "Remove bookmark" : "Bookmark"} ${post.title}`}
                                        >
                                            <Bookmark
                                                className={clsx(
                                                    "h-4 w-4",
                                                    bookmarked.has(post.id) && "fill-current",
                                                )}
                                                style={
                                                    bookmarked.has(post.id)
                                                        ? { color: theme.primary }
                                                        : undefined
                                                }
                                            />
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <button
                    onClick={() => router.push("/support")}
                    className="mt-6 flex w-full items-center gap-4 rounded-[20px] border border-[#e5e7eb] bg-white p-4 text-left shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
                >
                    <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white"
                        style={{ backgroundColor: theme.primary }}
                    >
                        <ShieldCheck className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                        <strong className="block text-sm text-[#111827]">
                            Need support? You&apos;re not alone.
                        </strong>
                        <span className="mt-0.5 block text-xs text-[#6b7280]">
                            Talk with the community or access support resources.
                        </span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-[#9ca3af]" />
                </button>
            </div>
        </div>
    );
}
