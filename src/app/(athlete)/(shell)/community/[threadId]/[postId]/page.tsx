"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowBigUp, ArrowUpCircle, ChevronLeft, Reply } from "lucide-react";
import clsx from "clsx";

import { api, type ApiComment } from "@/lib/athlete/api";
import { useAuth } from "@/lib/athlete/auth";
import {
    COMMENTS,
    FLAIR_STYLES,
    POSTS,
    type ForumComment,
    type ForumPost,
    type PostFlair,
} from "@/lib/core/community";

const adaptComments = (raw: ApiComment[] = []): ForumComment[] =>
    raw.map((c) => ({
        id: c.id,
        author: c.author_name,
        text: c.body,
        upvotes: c.upvotes,
        timeAgo: c.time_ago,
        replies: adaptComments(c.replies ?? []),
    }));

/*
 * Post and comment ids are UUID strings on the wire — the Drizzle baseline
 * replaced the integer keys this page was written against, so the old
 * `Number(postId)` conversions would produce NaN against every real id.
 */
const loadPost = async (
    postId: string,
): Promise<{ post: ForumPost; comments: ForumComment[] } | null> => {
    if (!postId) return null;
    const remote = await api.getPost(postId);
    if (!remote) return null;
    return {
        post: {
            id: remote.id,
            threadId: remote.forum_id,
            author: remote.author_name,
            flair: remote.flair as PostFlair,
            title: remote.title,
            body: remote.body,
            upvotes: remote.upvotes,
            commentCount: remote.comments.length,
            timeAgo: remote.time_ago,
        },
        comments: adaptComments(remote.comments),
    };
};

type ReplyTarget = { parentId: string | null; label: string } | null;

const CommentNode = ({
    comment,
    depth,
    onVote,
    onReply,
}: {
    comment: ForumComment;
    depth: number;
    onVote: (id: string) => void;
    onReply: (c: ForumComment) => void;
}) => (
    <div className={clsx(depth > 0 && "ml-6 mt-3 pl-4 border-l border-border-subtle")}>
        <div className="bg-bg-surface rounded-2xl rounded-tl-sm border border-border-subtle p-4">
            <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-bg-elevated flex items-center justify-center font-mono text-[10px] text-volt">
                    {comment.author}
                </div>
                <span className="font-mono text-[11px] text-text-tertiary">{comment.timeAgo}</span>
                <button
                    onClick={() => onReply(comment)}
                    aria-label={`Reply to ${comment.author}`}
                    className="ml-auto text-text-tertiary hover:text-text-primary transition-colors"
                >
                    <Reply className="w-4 h-4" />
                </button>
            </div>
            <p className="text-[15px] text-text-primary leading-relaxed">{comment.text}</p>
            <button
                onClick={() => onVote(comment.id)}
                className="flex items-center gap-1 mt-2 font-mono text-[11px] text-text-tertiary hover:text-volt transition-colors"
            >
                <ArrowBigUp className="w-4 h-4" /> {comment.upvotes}
            </button>
        </div>
        {comment.replies?.map((reply) => (
            <CommentNode
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                onVote={onVote}
                onReply={onReply}
            />
        ))}
    </div>
);

export default function PostPage() {
    const { threadId, postId } = useParams<{ threadId: string; postId: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const [post, setPost] = useState<ForumPost | undefined>(() =>
        POSTS.find((p) => p.id === postId),
    );
    const [comments, setComments] = useState<ForumComment[]>(() => COMMENTS[postId] ?? []);
    const [reply, setReply] = useState<ReplyTarget>(null);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        const fresh = await loadPost(postId);
        if (!fresh) return;
        setPost(fresh.post);
        setComments(fresh.comments);
    }, [postId]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const fresh = await loadPost(postId);
            if (cancelled || !fresh) return;
            setPost(fresh.post);
            setComments(fresh.comments);
        })();
        return () => {
            cancelled = true;
        };
    }, [postId]);

    const submitComment = async () => {
        if (!postId || !draft.trim()) return;
        setBusy(true);
        const res = await api.addComment(postId, draft.trim(), reply?.parentId ?? undefined);
        if (res) {
            setDraft("");
            setReply(null);
            load();
        }
        setBusy(false);
    };

    const voteOnComment = async (id: string) => {
        if (!user) return;
        await api.vote("comment", id);
        load();
    };

    const voteOnPost = async () => {
        if (!user || !postId) return;
        const res = await api.vote("post", postId);
        if (res) setPost((p) => (p ? { ...p, upvotes: res.upvotes } : p));
    };

    if (!post) {
        return (
            <div className="p-6 md:p-10 max-w-3xl mx-auto text-center pt-24 animate-rise">
                <h1 className="font-serif text-3xl text-sand italic mb-3">Post not found</h1>
                <p className="text-[14px] text-text-secondary mb-6">
                    It may have been removed, or the link is off.
                </p>
                <button
                    onClick={() => router.push(`/community/${threadId}`)}
                    className="text-volt text-[14px] hover:underline underline-offset-4"
                >
                    Back to the forum
                </button>
            </div>
        );
    }

    const replyBox = user ? (
        <div className="mt-3 bg-bg-elevated border border-border-subtle rounded-2xl p-3 animate-disclosure">
            {reply && (
                <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] text-text-tertiary">
                        Replying to {reply.label}
                    </span>
                    <button
                        onClick={() => setReply(null)}
                        className="text-[12px] text-text-tertiary hover:text-text-secondary"
                    >
                        cancel
                    </button>
                </div>
            )}
            <div className="relative flex items-center">
                <input
                    value={draft}
                    aria-label="Add a comment"
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitComment()}
                    placeholder="Add to the conversation..."
                    className="w-full bg-bg-base border border-border-subtle text-text-primary text-[15px] rounded-full py-3 pl-5 pr-14 focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt transition-all placeholder:text-text-tertiary"
                />
                <button
                    onClick={submitComment}
                    disabled={busy || !draft.trim()}
                    aria-label="Post comment"
                    className="absolute right-2 text-volt hover:text-volt/80 transition-colors disabled:opacity-40"
                >
                    <ArrowUpCircle className="w-8 h-8" />
                </button>
            </div>
        </div>
    ) : null;

    const handleReply = (c: ForumComment) => {
        setReply({ parentId: c.id, label: c.author });
        setDraft("");
    };

    return (
        <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
            <div className="flex-1 overflow-y-auto p-6 md:p-10">
                <button
                    onClick={() => router.push(`/community/${threadId}`)}
                    className="flex items-center gap-1 text-text-tertiary hover:text-text-primary text-[13px] mb-6 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" /> Back to forum
                </button>

                <article className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                        <span
                            className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${FLAIR_STYLES[post.flair]}`}
                        >
                            {post.flair}
                        </span>
                        <span className="font-mono text-[11px] text-text-tertiary">
                            {post.author} · {post.timeAgo}
                        </span>
                    </div>
                    <h1 className="font-serif text-3xl text-sand italic mb-3">{post.title}</h1>
                    <p className="text-[15px] text-text-primary leading-relaxed mb-4">{post.body}</p>
                    {user && (
                        <div className="flex items-center gap-5">
                            <button
                                onClick={voteOnPost}
                                className="flex items-center gap-1 font-mono text-[11px] text-text-tertiary hover:text-volt transition-colors"
                            >
                                <ArrowBigUp className="w-4 h-4" /> {post.upvotes}
                            </button>
                            <button
                                onClick={() => setReply({ parentId: null, label: post.title })}
                                className="flex items-center gap-1 font-mono text-[11px] text-text-tertiary hover:text-volt transition-colors"
                            >
                                <Reply className="w-4 h-4" /> Reply
                            </button>
                        </div>
                    )}
                    <div className="yard-line mt-6" />
                </article>

                <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary mb-4">
                    {comments.length} comments
                </h2>
                {replyBox}
                <div className="space-y-3 mt-3">
                    {comments.map((comment) => (
                        <CommentNode
                            key={comment.id}
                            comment={comment}
                            depth={0}
                            onVote={voteOnComment}
                            onReply={handleReply}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
