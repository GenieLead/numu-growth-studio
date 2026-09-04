CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"issuer" text,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annotations" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"generation_id" text,
	"source_asset_id" text NOT NULL,
	"time_sec" real,
	"clean_frame_asset_id" text,
	"annotated_frame_asset_id" text,
	"note" text,
	"geometry" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"parent_asset_id" text,
	"kind" text NOT NULL,
	"source" text NOT NULL,
	"name" text,
	"blob_url" text,
	"blob_pathname" text,
	"mime_type" text,
	"width" integer,
	"height" integer,
	"duration_sec" real,
	"metadata" jsonb,
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audio_tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"kind" text NOT NULL,
	"name" text,
	"blob_url" text,
	"blob_pathname" text,
	"mime_type" text DEFAULT 'audio/wav',
	"duration_sec" real,
	"start_time_sec" real DEFAULT 0 NOT NULL,
	"end_time_sec" real,
	"volume" real DEFAULT 1 NOT NULL,
	"fade_in_ms" integer DEFAULT 300,
	"fade_out_ms" integer DEFAULT 300,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"generation_id" text,
	"type" text NOT NULL,
	"estimated_credits" real,
	"actual_credits" real,
	"model" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_inputs" (
	"generation_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"role" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"task_type" text NOT NULL,
	"prompt" text NOT NULL,
	"reference_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"asset_urls" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"estimated_credits" real DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generations" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"parent_generation_id" text,
	"scene_id" text,
	"model" text NOT NULL,
	"provider" text NOT NULL,
	"intent" text,
	"compiled_prompt" text,
	"request_payload" jsonb,
	"openrouter_job_id" text,
	"polling_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"estimated_cost" real,
	"max_approved_cost" real,
	"actual_cost" real,
	"output_asset_id" text,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"role" text NOT NULL,
	"content" jsonb NOT NULL,
	"generation_plan_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_catalog_cache" (
	"model_id" text PRIMARY KEY NOT NULL,
	"capabilities" jsonb,
	"pricing" jsonb,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_assets" (
	"project_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"role" text,
	"entity_id" text
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT 'Untitled' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"production_graph" jsonb,
	"target_budget_credits" real,
	"credits_spent" real DEFAULT 0 NOT NULL,
	"thumbnail_asset_id" text,
	"current_generation_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"encrypted_openrouter_key" text,
	"openrouter_key_last4" text,
	"global_budget_credits" real,
	"preferred_aspect_ratio" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "annotations_project_id_idx" ON "annotations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "assets_user_id_idx" ON "assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assets_project_id_idx" ON "assets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "audio_tracks_project_id_idx" ON "audio_tracks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "cost_ledger_user_id_idx" ON "cost_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generation_plans_project_id_idx" ON "generation_plans" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "generations_project_id_idx" ON "generations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "generations_status_idx" ON "generations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_project_id_idx" ON "messages" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_assets_unique" ON "project_assets" USING btree ("project_id","asset_id");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");