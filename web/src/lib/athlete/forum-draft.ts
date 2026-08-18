"use client";

/*
 * One-shot handoff for the artifact "Share to forum" action.
 *
 * react-router carried this in `navigate(path, { state })`; the App Router has
 * no equivalent — `next/navigation` only moves URLs. A query string is the
 * other obvious option and is worse here: the body is a paragraph, it would
 * sit in history and in any shared link, and the draft is not addressable
 * state anyone should be able to hand someone else.
 *
 * `sessionStorage` keeps it to the tab that created it, and `takeDraft` clears
 * on read so a later visit to the same forum does not resurrect a stale
 * composer. The athlete still reviews and posts explicitly either way.
 */

const KEY = "tm_forum_draft_v1";

export interface ForumDraft {
    forumId: string;
    title: string;
    body: string;
}

export const putDraft = (draft: ForumDraft) => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(KEY, JSON.stringify(draft));
};

/** Reads and clears the pending draft, if it targets `forumId`. */
export const takeDraft = (forumId: string): ForumDraft | null => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    try {
        const draft = JSON.parse(raw) as ForumDraft;
        if (draft.forumId !== forumId) return null;
        sessionStorage.removeItem(KEY);
        return draft;
    } catch {
        sessionStorage.removeItem(KEY);
        return null;
    }
};
