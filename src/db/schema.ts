import {
  pgTable,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Better Auth Tables ──────────────────────────────────────────
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── User Settings ───────────────────────────────────────────────
export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey(),
  encryptedOpenrouterKey: text("encrypted_openrouter_key"),
  openrouterKeyLast4: text("openrouter_key_last4"),
  globalBudgetCredits: real("global_budget_credits"),
  preferredAspectRatio: text("preferred_aspect_ratio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Projects ────────────────────────────────────────────────────
export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull().default("Untitled"),
    status: text("status").notNull().default("draft"),
    productionGraph: jsonb("production_graph"),
    targetBudgetCredits: real("target_budget_credits"),
    creditsSpent: real("credits_spent").default(0).notNull(),
    thumbnailAssetId: text("thumbnail_asset_id"),
    currentGenerationId: text("current_generation_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("projects_user_id_idx").on(table.userId)]
);

// ─── Messages ────────────────────────────────────────────────────
export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    role: text("role").notNull(), // user | assistant | system_event
    content: jsonb("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("messages_project_id_idx").on(table.projectId)]
);

// ─── Assets ──────────────────────────────────────────────────────
export const assets = pgTable(
  "assets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    projectId: text("project_id"),
    parentAssetId: text("parent_asset_id"),
    kind: text("kind").notNull(), // reference | character | product | location | image | video | audio
    source: text("source").notNull(), // uploaded | generated | extracted
    name: text("name"),
    blobUrl: text("blob_url"),
    blobPathname: text("blob_pathname"),
    mimeType: text("mime_type"),
    width: integer("width"),
    height: integer("height"),
    durationSec: real("duration_sec"),
    metadata: jsonb("metadata"),
    approved: boolean("approved").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("assets_user_id_idx").on(table.userId),
    index("assets_project_id_idx").on(table.projectId),
  ]
);

// ─── Project Assets (junction) ──────────────────────────────────
export const projectAssets = pgTable(
  "project_assets",
  {
    projectId: text("project_id").notNull(),
    assetId: text("asset_id").notNull(),
    role: text("role"), // reference | character | product | location | output
    entityId: text("entity_id"),
  },
  (table) => [
    uniqueIndex("project_assets_unique").on(table.projectId, table.assetId),
  ]
);

// ─── Generations ────────────────────────────────────────────────
export const generations = pgTable(
  "generations",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    parentGenerationId: text("parent_generation_id"),
    sceneId: text("scene_id"),
    model: text("model").notNull(),
    provider: text("provider").notNull(),
    intent: text("intent"), // TEXT_TO_IMAGE, VIDEO_EDIT, etc.
    compiledPrompt: text("compiled_prompt"),
    requestPayload: jsonb("request_payload"),
    openrouterJobId: text("openrouter_job_id"),
    pollingUrl: text("polling_url"),
    status: text("status").notNull().default("pending"),
    estimatedCost: real("estimated_cost"),
    maxApprovedCost: real("max_approved_cost"),
    actualCost: real("actual_cost"),
    outputAssetId: text("output_asset_id"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("generations_project_id_idx").on(table.projectId),
    index("generations_status_idx").on(table.status),
  ]
);

// ─── Generation Inputs ──────────────────────────────────────────
export const generationInputs = pgTable("generation_inputs", {
  generationId: text("generation_id").notNull(),
  assetId: text("asset_id").notNull(),
  role: text("role").notNull(), // source | reference | character | product | location
  orderIndex: integer("order_index").default(0).notNull(),
});

// ─── Annotations ────────────────────────────────────────────────
export const annotations = pgTable(
  "annotations",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    generationId: text("generation_id"),
    sourceAssetId: text("source_asset_id").notNull(),
    timeSec: real("time_sec"),
    cleanFrameAssetId: text("clean_frame_asset_id"),
    annotatedFrameAssetId: text("annotated_frame_asset_id"),
    note: text("note"),
    geometry: jsonb("geometry"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("annotations_project_id_idx").on(table.projectId)]
);

// ─── Cost Ledger ────────────────────────────────────────────────
export const costLedger = pgTable(
  "cost_ledger",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    projectId: text("project_id"),
    generationId: text("generation_id"),
    type: text("type").notNull(), // estimate | actual | refund
    estimatedCredits: real("estimated_credits"),
    actualCredits: real("actual_credits"),
    model: text("model"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("cost_ledger_user_id_idx").on(table.userId)]
);

// ─── Model Catalog Cache ────────────────────────────────────────
export const modelCatalogCache = pgTable("model_catalog_cache", {
  modelId: text("model_id").primaryKey(),
  capabilities: jsonb("capabilities"),
  pricing: jsonb("pricing"),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────────────────
export const projectsRelations = relations(projects, ({ many }) => ({
  messages: many(messages),
  assets: many(projectAssets),
  generations: many(generations),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  project: one(projects, {
    fields: [messages.projectId],
    references: [projects.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  project: one(projects, {
    fields: [assets.projectId],
    references: [projects.id],
  }),
}));

export const generationsRelations = relations(generations, ({ one }) => ({
  project: one(projects, {
    fields: [generations.projectId],
    references: [projects.id],
  }),
}));
