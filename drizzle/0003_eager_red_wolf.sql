CREATE TYPE "public"."verification_method" AS ENUM('university_email', 'manual');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'approved', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "verification_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"method" "verification_method" NOT NULL,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"email" text,
	"normalized_email" text,
	"reason_category" varchar(80),
	"reason" text,
	"token_hash" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "verification_requests_email_shape" CHECK (("verification_requests"."method" = 'university_email' and "verification_requests"."email" is not null and "verification_requests"."normalized_email" is not null and "verification_requests"."token_hash" is not null and "verification_requests"."expires_at" is not null) or ("verification_requests"."method" = 'manual' and "verification_requests"."reason_category" is not null and "verification_requests"."token_hash" is null)),
	CONSTRAINT "verification_requests_resolved_timestamp" CHECK (("verification_requests"."status" = 'pending' and "verification_requests"."resolved_at" is null) or ("verification_requests"."status" <> 'pending' and "verification_requests"."resolved_at" is not null)),
	CONSTRAINT "verification_requests_expiry_after_request" CHECK ("verification_requests"."expires_at" is null or "verification_requests"."expires_at" > "verification_requests"."requested_at")
);
--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_verification_requests_user_pending" ON "verification_requests" USING btree ("user_id") WHERE "verification_requests"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_verification_requests_token_hash" ON "verification_requests" USING btree ("token_hash") WHERE "verification_requests"."token_hash" is not null;--> statement-breakpoint
CREATE INDEX "ix_verification_requests_pending_time" ON "verification_requests" USING btree ("requested_at") WHERE "verification_requests"."status" = 'pending';