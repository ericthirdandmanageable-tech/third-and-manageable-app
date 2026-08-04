CREATE TABLE "forum_memberships" (
	"user_id" uuid NOT NULL,
	"forum_id" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forum_memberships_user_id_forum_id_pk" PRIMARY KEY("user_id","forum_id")
);
--> statement-breakpoint
ALTER TABLE "forum_memberships" ADD CONSTRAINT "forum_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_memberships" ADD CONSTRAINT "forum_memberships_forum_id_forums_id_fk" FOREIGN KEY ("forum_id") REFERENCES "public"."forums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_forum_memberships_forum_time" ON "forum_memberships" USING btree ("forum_id","joined_at" DESC NULLS LAST);