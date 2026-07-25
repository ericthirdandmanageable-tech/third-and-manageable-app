CREATE TABLE "action_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action_id" text NOT NULL,
	"week_of" text NOT NULL,
	"completed_at" timestamp DEFAULT now(),
	"category" text
);
--> statement-breakpoint
CREATE TABLE "athlete_profiles" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"sport" text,
	"role" text,
	"years" text,
	"relied_on" text,
	"favorite" text,
	"intake_done" boolean DEFAULT false NOT NULL,
	"skill_map" jsonb,
	"intake_answers" jsonb,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "check_ins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" text NOT NULL,
	"prompt_id" text NOT NULL,
	"prompt_question" text NOT NULL,
	"option" text NOT NULL,
	"journal" text,
	"ambient" jsonb,
	"created_at" timestamp DEFAULT now(),
	"mood" integer
);
--> statement-breakpoint
CREATE TABLE "clipboard_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"persona" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"author_name" text NOT NULL,
	"parent_id" integer,
	"body" text NOT NULL,
	"upvotes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commitments" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"path_id" text NOT NULL,
	"committed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forums" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"member_count" integer DEFAULT 0,
	"active_now" integer DEFAULT 0,
	"icon" text NOT NULL,
	"path_id" text,
	"daily_prompt" text,
	"daily_prompt_author" text,
	"daily_prompt_updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "peer_support_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'notified',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"forum_id" text NOT NULL,
	"author_id" integer NOT NULL,
	"author_name" text NOT NULL,
	"flair" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"upvotes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tech_support_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"school" text,
	"status" varchar(20) DEFAULT 'transitioning' NOT NULL,
	"headline" varchar(140),
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"suspended" boolean DEFAULT false NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"chat_banned" boolean DEFAULT false NOT NULL,
	"verification_requested" boolean DEFAULT false NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"target_type" text NOT NULL,
	"target_id" integer NOT NULL,
	"value" integer DEFAULT 1
);
--> statement-breakpoint
ALTER TABLE "action_completions" ADD CONSTRAINT "action_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_profiles" ADD CONSTRAINT "athlete_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clipboard_messages" ADD CONSTRAINT "clipboard_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_support_requests" ADD CONSTRAINT "peer_support_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_forum_id_forums_id_fk" FOREIGN KEY ("forum_id") REFERENCES "public"."forums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tech_support_requests" ADD CONSTRAINT "tech_support_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_action_completions_user_id" ON "action_completions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_check_ins_user_id" ON "check_ins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_check_ins_date" ON "check_ins" USING btree ("date");--> statement-breakpoint
CREATE INDEX "ix_clipboard_messages_user_id" ON "clipboard_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_comments_post_id" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "ix_forums_category" ON "forums" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ix_posts_forum_id" ON "posts" USING btree ("forum_id");