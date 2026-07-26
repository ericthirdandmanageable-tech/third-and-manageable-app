CREATE TYPE "public"."admin_role" AS ENUM('owner', 'admin', 'moderator', 'support');--> statement-breakpoint
CREATE TYPE "public"."athlete_status" AS ENUM('competing', 'transitioning', 'transitioned');--> statement-breakpoint
CREATE TYPE "public"."audit_outcome" AS ENUM('succeeded', 'denied', 'failed');--> statement-breakpoint
CREATE TABLE "action_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action_id" text NOT NULL,
	"week_of" date NOT NULL,
	"category" varchar(32) NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_user_id" uuid,
	"actor_role" "admin_role",
	"session_id" uuid,
	"action" varchar(120) NOT NULL,
	"target_type" varchar(80),
	"target_id" text,
	"outcome" "audit_outcome" NOT NULL,
	"request_id" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_role_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "admin_role" NOT NULL,
	"granted_by" uuid,
	"reason" text,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "admin_role_revoked_after_grant" CHECK ("admin_role_assignments"."revoked_at" is null or "admin_role_assignments"."revoked_at" >= "admin_role_assignments"."granted_at")
);
--> statement-breakpoint
CREATE TABLE "athlete_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"sport" varchar(120),
	"role" varchar(120),
	"years" varchar(80),
	"relied_on" text,
	"favorite" varchar(240),
	"intake_done" boolean DEFAULT false NOT NULL,
	"skill_map" jsonb,
	"intake_answers" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_account_id" text NOT NULL,
	"provider_email" text,
	"provider_email_verified" boolean DEFAULT false NOT NULL,
	"profile" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "auth_identities_provider_nonempty" CHECK (length(trim("auth_identities"."provider")) > 0),
	CONSTRAINT "auth_identities_subject_nonempty" CHECK (length(trim("auth_identities"."provider_account_id")) > 0)
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"auth_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"user_agent_hash" text,
	"ip_hash" text,
	CONSTRAINT "auth_sessions_expiry_after_creation" CHECK ("auth_sessions"."expires_at" > "auth_sessions"."created_at"),
	CONSTRAINT "auth_sessions_version_positive" CHECK ("auth_sessions"."auth_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"prompt_id" text NOT NULL,
	"prompt_question" text NOT NULL,
	"option" text NOT NULL,
	"journal" text,
	"ambient" jsonb,
	"mood" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_ins_mood_range" CHECK ("check_ins"."mood" is null or "check_ins"."mood" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "clipboard_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(8) NOT NULL,
	"text" text NOT NULL,
	"persona" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clipboard_messages_role" CHECK ("clipboard_messages"."role" in ('user', 'ai'))
);
--> statement-breakpoint
CREATE TABLE "comment_votes" (
	"user_id" uuid NOT NULL,
	"comment_id" uuid NOT NULL,
	"value" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_votes_user_id_comment_id_pk" PRIMARY KEY("user_id","comment_id"),
	CONSTRAINT "comment_votes_value" CHECK ("comment_votes"."value" in (-1, 1))
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" varchar(80) NOT NULL,
	"parent_id" uuid,
	"body" text NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "commitments" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"path_id" text NOT NULL,
	"committed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forums" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(160) NOT NULL,
	"category" varchar(40) NOT NULL,
	"description" text NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"active_now" integer DEFAULT 0 NOT NULL,
	"icon" varchar(80) NOT NULL,
	"path_id" text,
	"daily_prompt" text,
	"daily_prompt_author" varchar(80),
	"daily_prompt_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forums_member_count_nonnegative" CHECK ("forums"."member_count" >= 0),
	CONSTRAINT "forums_active_now_nonnegative" CHECK ("forums"."active_now" >= 0)
);
--> statement-breakpoint
CREATE TABLE "password_credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peer_support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(24) DEFAULT 'notified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "peer_support_status" CHECK ("peer_support_requests"."status" in ('notified', 'connected', 'resolved'))
);
--> statement-breakpoint
CREATE TABLE "post_votes" (
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"value" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_votes_user_id_post_id_pk" PRIMARY KEY("user_id","post_id"),
	CONSTRAINT "post_votes_value" CHECK ("post_votes"."value" in (-1, 1))
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"forum_id" text NOT NULL,
	"author_id" uuid NOT NULL,
	"author_name" varchar(80) NOT NULL,
	"flair" varchar(32) NOT NULL,
	"title" varchar(240) NOT NULL,
	"body" text NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tech_support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"message" text NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "tech_support_status" CHECK ("tech_support_requests"."status" in ('open', 'pending', 'resolved'))
);
--> statement-breakpoint
CREATE TABLE "user_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	CONSTRAINT "user_emails_normalized_lowercase" CHECK ("user_emails"."normalized_email" = lower(trim("user_emails"."normalized_email"))),
	CONSTRAINT "user_emails_verified_timestamp" CHECK ("user_emails"."verified" = false or "user_emails"."verified_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(80) NOT NULL,
	"school" varchar(160),
	"status" "athlete_status" DEFAULT 'transitioning' NOT NULL,
	"headline" varchar(140),
	"verified" boolean DEFAULT false NOT NULL,
	"verification_requested" boolean DEFAULT false NOT NULL,
	"verification_requested_at" timestamp with time zone,
	"suspended" boolean DEFAULT false NOT NULL,
	"suspended_at" timestamp with time zone,
	"banned" boolean DEFAULT false NOT NULL,
	"banned_at" timestamp with time zone,
	"chat_banned" boolean DEFAULT false NOT NULL,
	"chat_banned_at" timestamp with time zone,
	"streak" integer DEFAULT 0 NOT NULL,
	"auth_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_streak_nonnegative" CHECK ("users"."streak" >= 0),
	CONSTRAINT "users_auth_version_positive" CHECK ("users"."auth_version" > 0)
);
--> statement-breakpoint
ALTER TABLE "action_completions" ADD CONSTRAINT "action_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_session_id_auth_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."auth_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_assignments" ADD CONSTRAINT "admin_role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_role_assignments" ADD CONSTRAINT "admin_role_assignments_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_profiles" ADD CONSTRAINT "athlete_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clipboard_messages" ADD CONSTRAINT "clipboard_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_credentials" ADD CONSTRAINT "password_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_support_requests" ADD CONSTRAINT "peer_support_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_votes" ADD CONSTRAINT "post_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_votes" ADD CONSTRAINT "post_votes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_forum_id_forums_id_fk" FOREIGN KEY ("forum_id") REFERENCES "public"."forums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tech_support_requests" ADD CONSTRAINT "tech_support_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_action_completions_user_action_week" ON "action_completions" USING btree ("user_id","action_id","week_of");--> statement-breakpoint
CREATE INDEX "ix_action_completions_user_week" ON "action_completions" USING btree ("user_id","week_of" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_action_completions_category_week" ON "action_completions" USING btree ("category","week_of" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_admin_audit_actor_time" ON "admin_audit_logs" USING btree ("actor_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_admin_audit_target_time" ON "admin_audit_logs" USING btree ("target_type","target_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_admin_audit_request_id" ON "admin_audit_logs" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_admin_role_assignments_active" ON "admin_role_assignments" USING btree ("user_id","role") WHERE "admin_role_assignments"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "ix_admin_role_assignments_user" ON "admin_role_assignments" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_auth_identities_provider_subject" ON "auth_identities" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "ix_auth_identities_user_id" ON "auth_identities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_auth_sessions_token_hash" ON "auth_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "ix_auth_sessions_user_active" ON "auth_sessions" USING btree ("user_id","expires_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_auth_sessions_expiry" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_check_ins_user_date" ON "check_ins" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "ix_check_ins_user_date" ON "check_ins" USING btree ("user_id","date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_check_ins_date" ON "check_ins" USING btree ("date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_clipboard_messages_user_time" ON "clipboard_messages" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_comment_votes_comment" ON "comment_votes" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "ix_comments_post_time" ON "comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "ix_comments_parent_time" ON "comments" USING btree ("parent_id","created_at");--> statement-breakpoint
CREATE INDEX "ix_comments_author_time" ON "comments" USING btree ("author_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_forums_category" ON "forums" USING btree ("category","title");--> statement-breakpoint
CREATE INDEX "ix_peer_support_status_time" ON "peer_support_requests" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_peer_support_user_time" ON "peer_support_requests" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_post_votes_post" ON "post_votes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "ix_posts_forum_time" ON "posts" USING btree ("forum_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_posts_author_time" ON "posts" USING btree ("author_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_tech_support_status_time" ON "tech_support_requests" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_tech_support_user_time" ON "tech_support_requests" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_user_emails_normalized" ON "user_emails" USING btree ("normalized_email");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_user_emails_one_primary" ON "user_emails" USING btree ("user_id") WHERE "user_emails"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "ix_user_emails_user_id" ON "user_emails" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_users_created_at" ON "users" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ix_users_moderation" ON "users" USING btree ("banned","suspended","chat_banned") WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "ix_users_verification_queue" ON "users" USING btree ("verification_requested_at") WHERE "users"."verification_requested" = true and "users"."deleted_at" is null;--> statement-breakpoint
CREATE FUNCTION "prevent_admin_audit_log_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'admin_audit_logs is append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "admin_audit_logs_append_only"
BEFORE UPDATE OR DELETE ON "admin_audit_logs"
FOR EACH ROW
EXECUTE FUNCTION "prevent_admin_audit_log_mutation"();
