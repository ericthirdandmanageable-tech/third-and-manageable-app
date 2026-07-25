/**
 * Drizzle port of `backend/app/database.py` (VERCEL_MIGRATION_PLAN.md §4 step 4).
 *
 * The SQLAlchemy models are the post-Alembic state — all three revisions
 * (9b002fad09d3 → 4c7e1a9f2b08 → 7d2e5f8a1c34) are already folded in, so this
 * file replays them as a single baseline rather than three migrations.
 *
 * Columns marked `§3` do not exist in SQLAlchemy. They are the Firestore fields the
 * admin portal reads and writes today, added here so Phase 3 can retire Firestore.
 *
 * Timestamps are deliberately `timestamp` (no time zone), matching SQLAlchemy's naive
 * `DateTime` + `datetime.utcnow`. The Phase 2 FastAPI bridge runs against this same
 * Neon database, so the column types must agree with it. Revisit at Phase 2 step 16,
 * once the Python deployment is gone.
 */
import {
    boolean,
    integer,
    jsonb,
    pgTable,
    serial,
    text,
    timestamp,
    varchar,
    index,
    type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    school: text("school"),
    /** Onboarding step 1: "competing" | "transitioning" | "transitioned". */
    status: varchar("status", { length: 20 }).notNull().default("transitioning"),
    /** "Former linebacker → future physical therapist" — the profile page centers on it. */
    headline: varchar("headline", { length: 140 }),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),

    // §3 — moderation flags. Firestore-only today, and *decorative*: the API never
    // reads them (§6.3). Phase 3 must add enforcement in the auth middleware too,
    // otherwise banning a user still does nothing.
    suspended: boolean("suspended").notNull().default(false),
    banned: boolean("banned").notNull().default(false),
    chatBanned: boolean("chat_banned").notNull().default(false),
    verificationRequested: boolean("verification_requested").notNull().default(false),
    /** §3 — denormalised check-in streak; the admin dashboard reads it directly. */
    streak: integer("streak").notNull().default(0),
});

export const athleteProfiles = pgTable("athlete_profiles", {
    userId: integer("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    sport: text("sport"),
    role: text("role"),
    years: text("years"),
    /** The Hinge-style story prompt. */
    reliedOn: text("relied_on"),
    favorite: text("favorite"),
    intakeDone: boolean("intake_done").notNull().default(false),
    /** Cached derived SkillMapEntry[]. */
    skillMap: jsonb("skill_map"),
    intakeAnswers: jsonb("intake_answers"),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date()),
});

export const checkIns = pgTable("check_ins", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    /** YYYY-MM-DD. */
    date: text("date").notNull(),
    promptId: text("prompt_id").notNull(),
    promptQuestion: text("prompt_question").notNull(),
    option: text("option").notNull(),
    journal: text("journal"),
    ambient: jsonb("ambient"),
    createdAt: timestamp("created_at").defaultNow(),

    /** §3 — 1–5. The admin `/checkins` page charts it; SQL only had `option`. */
    mood: integer("mood"),
}, (t) => [
    index("ix_check_ins_user_id").on(t.userId),
    index("ix_check_ins_date").on(t.date),
]);

export const commitments = pgTable("commitments", {
    userId: integer("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    pathId: text("path_id").notNull(),
    committedAt: timestamp("committed_at").defaultNow(),
});

export const actionCompletions = pgTable("action_completions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    actionId: text("action_id").notNull(),
    /** ISO week date. */
    weekOf: text("week_of").notNull(),
    completedAt: timestamp("completed_at").defaultNow(),

    /** §3 / §6.5 — one of the fifteen categorized habits. The admin taxonomy won; the
     *  backend's `a1`–`a4` is replaced. */
    category: text("category"),
}, (t) => [index("ix_action_completions_user_id").on(t.userId)]);

export const clipboardMessages = pgTable("clipboard_messages", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    /** user | ai */
    role: text("role").notNull(),
    text: text("text").notNull(),
    persona: text("persona").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
}, (t) => [index("ix_clipboard_messages_user_id").on(t.userId)]);

export const forums = pgTable("forums", {
    /** path-consulting | local-davis-soccer | ... */
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    /** Path | Local | Sport | Support */
    category: text("category").notNull(),
    description: text("description").notNull(),
    memberCount: integer("member_count").default(0),
    activeNow: integer("active_now").default(0),
    /** lucide icon name */
    icon: text("icon").notNull(),
    pathId: text("path_id"),

    // §3 — the daily prompt, written by the admin portal's /api/update-prompt.
    dailyPrompt: text("daily_prompt"),
    dailyPromptAuthor: text("daily_prompt_author"),
    dailyPromptUpdatedAt: timestamp("daily_prompt_updated_at"),
}, (t) => [index("ix_forums_category").on(t.category)]);

export const posts = pgTable("posts", {
    id: serial("id").primaryKey(),
    forumId: text("forum_id")
        .notNull()
        .references(() => forums.id),
    authorId: integer("author_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    /** Denormalised on purpose: §6.4 — never store the author's email here. */
    authorName: text("author_name").notNull(),
    /** WIN | VENT | QUESTION | RESOURCE | MILESTONE */
    flair: text("flair").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    upvotes: integer("upvotes").default(0),
    createdAt: timestamp("created_at").defaultNow(),
}, (t) => [index("ix_posts_forum_id").on(t.forumId)]);

export const comments = pgTable("comments", {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
        .notNull()
        .references(() => posts.id, { onDelete: "cascade" }),
    authorId: integer("author_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    /** Denormalised on purpose: §6.4 — never store the author's email here. */
    authorName: text("author_name").notNull(),
    parentId: integer("parent_id").references((): AnyPgColumn => comments.id, {
        onDelete: "cascade",
    }),
    body: text("body").notNull(),
    upvotes: integer("upvotes").default(0),
    createdAt: timestamp("created_at").defaultNow(),
}, (t) => [index("ix_comments_post_id").on(t.postId)]);

export const votes = pgTable("votes", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    /** post | comment — a polymorphic target, so no FK is possible. */
    targetType: text("target_type").notNull(),
    targetId: integer("target_id").notNull(),
    value: integer("value").default(1),
});

export const peerSupportRequests = pgTable("peer_support_requests", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    /** notified | resolved */
    status: text("status").default("notified"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const techSupportRequests = pgTable("tech_support_requests", {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    /** open | resolved */
    status: text("status").default("open"),
    createdAt: timestamp("created_at").defaultNow(),
});
