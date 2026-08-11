/**
 * Unapplied Postgres baseline for Third & Manageable.
 *
 * This intentionally replaces the first Drizzle draft before any database has
 * received it. Provider identities are separate from users and emails, admin
 * authorization is explicit and auditable, externally referenced entities use
 * UUIDs, calendar values use `date`, and instants use UTC-aware `timestamptz`.
 *
 * Do not weaken this baseline to match retired SQLite-era models.
 */
import { sql } from "drizzle-orm";
import {
    bigserial,
    boolean,
    check,
    date,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    primaryKey,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
    type AnyPgColumn,
} from "drizzle-orm/pg-core";

const utcTimestamp = (name: string) =>
    timestamp(name, { withTimezone: true, mode: "date" });

export const athleteStatus = pgEnum("athlete_status", [
    "competing",
    "transitioning",
    "transitioned",
]);

export const adminRole = pgEnum("admin_role", [
    "owner",
    "admin",
    "moderator",
    "support",
]);

export const auditOutcome = pgEnum("audit_outcome", [
    "succeeded",
    "denied",
    "failed",
]);

export const users = pgTable(
    "users",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        displayName: varchar("display_name", { length: 80 }).notNull(),
        school: varchar("school", { length: 160 }),
        status: athleteStatus("status").notNull().default("transitioning"),
        headline: varchar("headline", { length: 140 }),
        verified: boolean("verified").notNull().default(false),
        verificationRequested: boolean("verification_requested")
            .notNull()
            .default(false),
        verificationRequestedAt: utcTimestamp("verification_requested_at"),
        suspended: boolean("suspended").notNull().default(false),
        suspendedAt: utcTimestamp("suspended_at"),
        banned: boolean("banned").notNull().default(false),
        bannedAt: utcTimestamp("banned_at"),
        chatBanned: boolean("chat_banned").notNull().default(false),
        chatBannedAt: utcTimestamp("chat_banned_at"),
        streak: integer("streak").notNull().default(0),
        /** Increment to invalidate every session for this user. */
        authVersion: integer("auth_version").notNull().default(1),
        createdAt: utcTimestamp("created_at").notNull().defaultNow(),
        updatedAt: utcTimestamp("updated_at").notNull().defaultNow(),
        /** Soft-delete marker; erasure/anonymization is a separate audited job. */
        deletedAt: utcTimestamp("deleted_at"),
    },
    (t) => [
        check("users_streak_nonnegative", sql`${t.streak} >= 0`),
        check("users_auth_version_positive", sql`${t.authVersion} > 0`),
        index("ix_users_created_at").on(t.createdAt.desc()),
        index("ix_users_moderation")
            .on(t.banned, t.suspended, t.chatBanned)
            .where(sql`${t.deletedAt} is null`),
        index("ix_users_verification_queue")
            .on(t.verificationRequestedAt)
            .where(
                sql`${t.verificationRequested} = true and ${t.deletedAt} is null`,
            ),
    ],
);

/**
 * Emails are attributes, not identity keys. A matching provider email never
 * auto-links accounts; a signed-in linking ceremony owns that decision.
 */
export const userEmails = pgTable(
    "user_emails",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        email: text("email").notNull(),
        normalizedEmail: text("normalized_email").notNull(),
        verified: boolean("verified").notNull().default(false),
        primary: boolean("is_primary").notNull().default(false),
        createdAt: utcTimestamp("created_at").notNull().defaultNow(),
        verifiedAt: utcTimestamp("verified_at"),
    },
    (t) => [
        uniqueIndex("ux_user_emails_normalized").on(t.normalizedEmail),
        uniqueIndex("ux_user_emails_one_primary")
            .on(t.userId)
            .where(sql`${t.primary} = true`),
        index("ix_user_emails_user_id").on(t.userId),
        check(
            "user_emails_normalized_lowercase",
            sql`${t.normalizedEmail} = lower(trim(${t.normalizedEmail}))`,
        ),
        check(
            "user_emails_verified_timestamp",
            sql`${t.verified} = false or ${t.verifiedAt} is not null`,
        ),
    ],
);

/**
 * Stable account mapping for Google, Apple, Firebase UID, and future providers.
 * `(provider, providerAccountId)` is authoritative; email is only a snapshot.
 */
export const authIdentities = pgTable(
    "auth_identities",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        provider: varchar("provider", { length: 32 }).notNull(),
        providerAccountId: text("provider_account_id").notNull(),
        providerEmail: text("provider_email"),
        providerEmailVerified: boolean("provider_email_verified")
            .notNull()
            .default(false),
        /** Minimal non-token profile snapshot for migration/reconciliation. */
        profile: jsonb("profile").$type<Record<string, unknown>>(),
        createdAt: utcTimestamp("created_at").notNull().defaultNow(),
        updatedAt: utcTimestamp("updated_at").notNull().defaultNow(),
        lastLoginAt: utcTimestamp("last_login_at"),
    },
    (t) => [
        uniqueIndex("ux_auth_identities_provider_subject").on(
            t.provider,
            t.providerAccountId,
        ),
        index("ix_auth_identities_user_id").on(t.userId),
        check(
            "auth_identities_provider_nonempty",
            sql`length(trim(${t.provider})) > 0`,
        ),
        check(
            "auth_identities_subject_nonempty",
            sql`length(trim(${t.providerAccountId})) > 0`,
        ),
    ],
);

/** Password credentials exist only for legacy/compatibility accounts. */
export const passwordCredentials = pgTable("password_credentials", {
    userId: uuid("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    passwordHash: text("password_hash").notNull(),
    updatedAt: utcTimestamp("updated_at").notNull().defaultNow(),
});

/**
 * Server-side revocation record for a signed session's random `jti`.
 * Only a hash of the token identifier is persisted.
 */
export const authSessions = pgTable(
    "auth_sessions",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        tokenHash: text("token_hash").notNull(),
        authVersion: integer("auth_version").notNull(),
        createdAt: utcTimestamp("created_at").notNull().defaultNow(),
        lastSeenAt: utcTimestamp("last_seen_at").notNull().defaultNow(),
        expiresAt: utcTimestamp("expires_at").notNull(),
        revokedAt: utcTimestamp("revoked_at"),
        userAgentHash: text("user_agent_hash"),
        ipHash: text("ip_hash"),
    },
    (t) => [
        uniqueIndex("ux_auth_sessions_token_hash").on(t.tokenHash),
        index("ix_auth_sessions_user_active").on(
            t.userId,
            t.expiresAt.desc(),
        ),
        index("ix_auth_sessions_expiry").on(t.expiresAt),
        check(
            "auth_sessions_expiry_after_creation",
            sql`${t.expiresAt} > ${t.createdAt}`,
        ),
        check("auth_sessions_version_positive", sql`${t.authVersion} > 0`),
    ],
);

/** One row per grant period; revocation closes the row instead of erasing it. */
export const adminRoleAssignments = pgTable(
    "admin_role_assignments",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        role: adminRole("role").notNull(),
        grantedBy: uuid("granted_by").references((): AnyPgColumn => users.id, {
            onDelete: "set null",
        }),
        reason: text("reason"),
        grantedAt: utcTimestamp("granted_at").notNull().defaultNow(),
        revokedAt: utcTimestamp("revoked_at"),
    },
    (t) => [
        uniqueIndex("ux_admin_role_assignments_active")
            .on(t.userId, t.role)
            .where(sql`${t.revokedAt} is null`),
        index("ix_admin_role_assignments_user").on(t.userId, t.revokedAt),
        check(
            "admin_role_revoked_after_grant",
            sql`${t.revokedAt} is null or ${t.revokedAt} >= ${t.grantedAt}`,
        ),
    ],
);

/**
 * Append-only privileged-operation log. The baseline migration installs a
 * trigger rejecting UPDATE/DELETE, and the application database role should
 * also lack those privileges. Avoid raw PHI and secrets in JSON fields.
 */
export const adminAuditLogs = pgTable(
    "admin_audit_logs",
    {
        id: bigserial("id", { mode: "bigint" }).primaryKey(),
        actorUserId: uuid("actor_user_id").references(() => users.id, {
            onDelete: "set null",
        }),
        actorRole: adminRole("actor_role"),
        sessionId: uuid("session_id").references(() => authSessions.id, {
            onDelete: "set null",
        }),
        action: varchar("action", { length: 120 }).notNull(),
        targetType: varchar("target_type", { length: 80 }),
        targetId: text("target_id"),
        outcome: auditOutcome("outcome").notNull(),
        requestId: text("request_id").notNull(),
        beforeState: jsonb("before_state").$type<Record<string, unknown>>(),
        afterState: jsonb("after_state").$type<Record<string, unknown>>(),
        metadata: jsonb("metadata").$type<Record<string, unknown>>(),
        createdAt: utcTimestamp("created_at").notNull().defaultNow(),
    },
    (t) => [
        index("ix_admin_audit_actor_time").on(
            t.actorUserId,
            t.createdAt.desc(),
        ),
        index("ix_admin_audit_target_time").on(
            t.targetType,
            t.targetId,
            t.createdAt.desc(),
        ),
        index("ix_admin_audit_request_id").on(t.requestId),
    ],
);

export const athleteProfiles = pgTable("athlete_profiles", {
    userId: uuid("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    sport: varchar("sport", { length: 120 }),
    role: varchar("role", { length: 120 }),
    years: varchar("years", { length: 80 }),
    reliedOn: text("relied_on"),
    favorite: varchar("favorite", { length: 240 }),
    intakeDone: boolean("intake_done").notNull().default(false),
    skillMap: jsonb("skill_map").$type<unknown[]>(),
    intakeAnswers: jsonb("intake_answers").$type<Record<string, unknown>>(),
    updatedAt: utcTimestamp("updated_at").notNull().defaultNow(),
});

export const checkIns = pgTable(
    "check_ins",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        date: date("date", { mode: "string" }).notNull(),
        promptId: text("prompt_id").notNull(),
        promptQuestion: text("prompt_question").notNull(),
        option: text("option").notNull(),
        journal: text("journal"),
        ambient: jsonb("ambient").$type<Record<string, unknown>>(),
        mood: integer("mood"),
        createdAt: utcTimestamp("created_at").notNull().defaultNow(),
        updatedAt: utcTimestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex("ux_check_ins_user_date").on(t.userId, t.date),
        index("ix_check_ins_user_date").on(t.userId, t.date.desc()),
        index("ix_check_ins_date").on(t.date.desc()),
        check(
            "check_ins_mood_range",
            sql`${t.mood} is null or ${t.mood} between 1 and 5`,
        ),
    ],
);

export const commitments = pgTable("commitments", {
    userId: uuid("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    pathId: text("path_id").notNull(),
    committedAt: utcTimestamp("committed_at").notNull().defaultNow(),
    updatedAt: utcTimestamp("updated_at").notNull().defaultNow(),
});

export const actionCompletions = pgTable(
    "action_completions",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        actionId: text("action_id").notNull(),
        weekOf: date("week_of", { mode: "string" }).notNull(),
        category: varchar("category", { length: 32 }).notNull(),
        completedAt: utcTimestamp("completed_at").notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex("ux_action_completions_user_action_week").on(
            t.userId,
            t.actionId,
            t.weekOf,
        ),
        index("ix_action_completions_user_week").on(
            t.userId,
            t.weekOf.desc(),
        ),
        index("ix_action_completions_category_week").on(
            t.category,
            t.weekOf.desc(),
        ),
    ],
);

export const clipboardMessages = pgTable(
    "clipboard_messages",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        role: varchar("role", { length: 8 }).notNull(),
        text: text("text").notNull(),
        persona: varchar("persona", { length: 80 }).notNull(),
        createdAt: utcTimestamp("created_at").notNull().defaultNow(),
    },
    (t) => [
        index("ix_clipboard_messages_user_time").on(
            t.userId,
            t.createdAt.desc(),
        ),
        check(
            "clipboard_messages_role",
            sql`${t.role} in ('user', 'ai')`,
        ),
    ],
);

export const forums = pgTable(
    "forums",
    {
        id: text("id").primaryKey(),
        title: varchar("title", { length: 160 }).notNull(),
        category: varchar("category", { length: 40 }).notNull(),
        description: text("description").notNull(),
        memberCount: integer("member_count").notNull().default(0),
        activeNow: integer("active_now").notNull().default(0),
        icon: varchar("icon", { length: 80 }).notNull(),
        pathId: text("path_id"),
        dailyPrompt: text("daily_prompt"),
        dailyPromptAuthor: varchar("daily_prompt_author", { length: 80 }),
        dailyPromptUpdatedAt: utcTimestamp("daily_prompt_updated_at"),
        createdAt: utcTimestamp("created_at").notNull().defaultNow(),
        updatedAt: utcTimestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [
        index("ix_forums_category").on(t.category, t.title),
        check("forums_member_count_nonnegative", sql`${t.memberCount} >= 0`),
        check("forums_active_now_nonnegative", sql`${t.activeNow} >= 0`),
    ],
);

/**
 * An athlete's community subscriptions power their personalized feed.
 * Membership is deliberately separate from posting: someone can follow a
 * community quietly, and authors are auto-joined on their first post.
 */
export const forumMemberships = pgTable(
    "forum_memberships",
    {
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        forumId: text("forum_id")
            .notNull()
            .references(() => forums.id, { onDelete: "cascade" }),
        joinedAt: utcTimestamp("joined_at").notNull().defaultNow(),
    },
    (t) => [
        primaryKey({ columns: [t.userId, t.forumId] }),
        index("ix_forum_memberships_forum_time").on(
            t.forumId,
            t.joinedAt.desc(),
        ),
    ],
);

export const posts = pgTable(
    "posts",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        forumId: text("forum_id")
            .notNull()
            .references(() => forums.id, { onDelete: "cascade" }),
        authorId: uuid("author_id")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        /** Denormalized display name; never an email address. */
        authorName: varchar("author_name", { length: 80 }).notNull(),
        flair: varchar("flair", { length: 32 }).notNull(),
        title: varchar("title", { length: 240 }).notNull(),
        body: text("body").notNull(),
        upvotes: integer("upvotes").notNull().default(0),
        createdAt: utcTimestamp("created_at").notNull().defaultNow(),
        updatedAt: utcTimestamp("updated_at").notNull().defaultNow(),
        deletedAt: utcTimestamp("deleted_at"),
    },
    (t) => [
        index("ix_posts_forum_time").on(t.forumId, t.createdAt.desc()),
        index("ix_posts_author_time").on(t.authorId, t.createdAt.desc()),
    ],
);

export const comments = pgTable(
    "comments",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        postId: uuid("post_id")
            .notNull()
            .references(() => posts.id, { onDelete: "cascade" }),
        authorId: uuid("author_id")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        authorName: varchar("author_name", { length: 80 }).notNull(),
        parentId: uuid("parent_id").references(
            (): AnyPgColumn => comments.id,
            { onDelete: "cascade" },
        ),
        body: text("body").notNull(),
        upvotes: integer("upvotes").notNull().default(0),
        createdAt: utcTimestamp("created_at").notNull().defaultNow(),
        updatedAt: utcTimestamp("updated_at").notNull().defaultNow(),
        deletedAt: utcTimestamp("deleted_at"),
    },
    (t) => [
        index("ix_comments_post_time").on(t.postId, t.createdAt),
        index("ix_comments_parent_time").on(t.parentId, t.createdAt),
        index("ix_comments_author_time").on(t.authorId, t.createdAt.desc()),
    ],
);

/** Split vote tables keep real foreign keys instead of a polymorphic target. */
export const postVotes = pgTable(
    "post_votes",
    {
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        postId: uuid("post_id")
            .notNull()
            .references(() => posts.id, { onDelete: "cascade" }),
        value: integer("value").notNull().default(1),
        createdAt: utcTimestamp("created_at").notNull().defaultNow(),
        updatedAt: utcTimestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [
        primaryKey({ columns: [t.userId, t.postId] }),
        index("ix_post_votes_post").on(t.postId),
        check("post_votes_value", sql`${t.value} in (-1, 1)`),
    ],
);

export const commentVotes = pgTable(
    "comment_votes",
    {
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        commentId: uuid("comment_id")
            .notNull()
            .references(() => comments.id, { onDelete: "cascade" }),
        value: integer("value").notNull().default(1),
        createdAt: utcTimestamp("created_at").notNull().defaultNow(),
        updatedAt: utcTimestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [
        primaryKey({ columns: [t.userId, t.commentId] }),
        index("ix_comment_votes_comment").on(t.commentId),
        check("comment_votes_value", sql`${t.value} in (-1, 1)`),
    ],
);

export const peerSupportRequests = pgTable(
    "peer_support_requests",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        status: varchar("status", { length: 24 }).notNull().default("notified"),
        createdAt: utcTimestamp("created_at").notNull().defaultNow(),
        updatedAt: utcTimestamp("updated_at").notNull().defaultNow(),
        resolvedAt: utcTimestamp("resolved_at"),
    },
    (t) => [
        index("ix_peer_support_status_time").on(
            t.status,
            t.createdAt.desc(),
        ),
        index("ix_peer_support_user_time").on(t.userId, t.createdAt.desc()),
        check(
            "peer_support_status",
            sql`${t.status} in ('notified', 'connected', 'resolved')`,
        ),
    ],
);

export const techSupportRequests = pgTable(
    "tech_support_requests",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        message: text("message").notNull(),
        status: varchar("status", { length: 24 }).notNull().default("open"),
        createdAt: utcTimestamp("created_at").notNull().defaultNow(),
        updatedAt: utcTimestamp("updated_at").notNull().defaultNow(),
        resolvedAt: utcTimestamp("resolved_at"),
    },
    (t) => [
        index("ix_tech_support_status_time").on(
            t.status,
            t.createdAt.desc(),
        ),
        index("ix_tech_support_user_time").on(t.userId, t.createdAt.desc()),
        check(
            "tech_support_status",
            sql`${t.status} in ('open', 'pending', 'resolved')`,
        ),
    ],
);
