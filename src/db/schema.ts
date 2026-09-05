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
  customType,
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
  issuer: text("issuer"),
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
    brandId: text("brand_id"),
    parentProjectId: text("parent_project_id"),
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
    generationPlanId: text("generation_plan_id"),
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
    brandId: text("brand_id"),
    parentAssetId: text("parent_asset_id"),
    kind: text("kind").notNull(), // reference | character | product | location | image | video | audio
    category: text("category"), // extended category for library filtering
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
    libraryVisible: boolean("library_visible").default(true).notNull(),
    checksum: text("checksum"),
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

// ─── Audio Tracks ────────────────────────────────────────────────
export const audioTracks = pgTable(
  "audio_tracks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    kind: text("kind").notNull(), // dialogue | voiceover | music | ambience | foley | sfx | impact
    name: text("name"),
    blobUrl: text("blob_url"),
    blobPathname: text("blob_pathname"),
    mimeType: text("mime_type").default("audio/wav"),
    durationSec: real("duration_sec"),
    startTimeSec: real("start_time_sec").default(0).notNull(),
    endTimeSec: real("end_time_sec"),
    volume: real("volume").default(1.0).notNull(),
    fadeInMs: integer("fade_in_ms").default(300),
    fadeOutMs: integer("fade_out_ms").default(300),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audio_tracks_project_id_idx").on(table.projectId),
  ]
);

// ─── Brands ──────────────────────────────────────────────────────
export const brands = pgTable(
  "brands",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    positioning: text("positioning"),
    personality: text("personality"),
    visualSystem: text("visual_system"),
    toneOfVoice: text("tone_of_voice"),
    values: text("values"),
    rules: jsonb("rules"), // { approvedClaims, forbiddenClaims, legalNotes }
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("brands_user_id_idx").on(table.userId)]
);

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(",")
      .map(Number);
  },
});

// ─── Knowledge Items ─────────────────────────────────────────────
export const knowledgeItems = pgTable(
  "knowledge_items",
  {
    id: text("id").primaryKey(),
    brandId: text("brand_id").notNull(),
    sourceType: text("source_type").notNull(), // document | url | upload
    title: text("title").notNull(),
    rawAssetId: text("raw_asset_id"),
    textContent: text("text_content"),
    embedding: vector("embedding"),
    trustLevel: text("trust_level").notNull().default("user"), // user | verified | system
    metadata: jsonb("metadata"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("knowledge_items_brand_id_idx").on(table.brandId)]
);

// ─── Taste References ────────────────────────────────────────────
export const tasteReferences = pgTable(
  "taste_references",
  {
    id: text("id").primaryKey(),
    brandId: text("brand_id").notNull(),
    assetId: text("asset_id"),
    url: text("url"),
    roles: jsonb("roles"), // ["cinematography", "lighting", "motion"]
    notes: text("notes"),
    preferenceWeight: real("preference_weight").default(1.0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("taste_references_brand_id_idx").on(table.brandId)]
);

// ─── Entities ────────────────────────────────────────────────────
export const entities = pgTable(
  "entities",
  {
    id: text("id").primaryKey(),
    brandId: text("brand_id").notNull(),
    type: text("type").notNull(), // character | product | location | costume | prop | voice | style
    name: text("name").notNull(),
    canonicalDescription: text("canonical_description"),
    rules: jsonb("rules"), // consistency rules, approved angles, etc.
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("entities_brand_id_idx").on(table.brandId),
    index("entities_type_idx").on(table.type),
  ]
);

// ─── Entity Assets (junction) ────────────────────────────────────
export const entityAssets = pgTable(
  "entity_assets",
  {
    entityId: text("entity_id").notNull(),
    assetId: text("asset_id").notNull(),
    role: text("role").notNull(), // front | side | macro | reference | approved
    approved: boolean("approved").default(true).notNull(),
  },
  (table) => [uniqueIndex("entity_assets_unique").on(table.entityId, table.assetId)]
);

// ─── Feedback Events ─────────────────────────────────────────────
export const feedbackEvents = pgTable(
  "feedback_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    projectId: text("project_id"),
    assetId: text("asset_id"),
    eventType: text("event_type").notNull(), // approve | reject | revision | publish | performance
    reason: text("reason"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("feedback_events_user_id_idx").on(table.userId)]
);

// ─── Generation Plans ────────────────────────────────────────────

// ─── Scenes ─────────────────────────────────────────────────────
export const scenes = pgTable(
  "scenes",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    orderIndex: integer("order_index").notNull(),
    title: text("title"),
    durationSec: real("duration_sec"),
    state: jsonb("state"), // ContinuityBundle
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("scenes_project_id_idx").on(table.projectId)]
);

// ─── Shots ──────────────────────────────────────────────────────
export const shots = pgTable(
  "shots",
  {
    id: text("id").primaryKey(),
    sceneId: text("scene_id").notNull(),
    startSec: real("start_sec").notNull(),
    endSec: real("end_sec").notNull(),
    state: jsonb("state"),
  },
  (table) => [index("shots_scene_id_idx").on(table.sceneId)]
);

// ─── Generation Plans ────────────────────────────────────────────
export const generationPlans = pgTable(
  "generation_plans",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    taskType: text("task_type").notNull(),
    prompt: text("prompt").notNull(),
    referenceUrls: jsonb("reference_urls").default([]).notNull(),
    assetUrls: jsonb("asset_urls").default({}).notNull(),
    settings: jsonb("settings").default({}).notNull(),
    estimatedCredits: real("estimated_credits").default(0),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("generation_plans_project_id_idx").on(table.projectId)]
);

// ─── Social Posts ────────────────────────────────────────────────
export const socialPosts = pgTable(
  "social_posts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    projectId: text("project_id"),
    platform: text("platform").notNull(),
    externalId: text("external_id"),
    caption: text("caption"),
    assetUrl: text("asset_url"),
    publishedAt: timestamp("published_at"),
    objective: text("objective").default("engagement"),
    status: text("status").default("draft"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("social_posts_user_id_idx").on(table.userId),
    index("social_posts_platform_idx").on(table.platform),
  ]
);

// ─── Performance Snapshots ────────────────────────────────────────
export const performanceSnapshots = pgTable(
  "performance_snapshots",
  {
    id: text("id").primaryKey(),
    socialPostId: text("social_post_id").notNull(),
    capturedAt: text("captured_at").notNull(),
    metrics: jsonb("metrics").notNull(),
    normalizedScore: real("normalized_score"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("performance_snapshots_social_post_id_idx").on(table.socialPostId),
  ]
);

// ─── Autopilot Programs ────────────────────────────────────────
export const autopilotPrograms = pgTable(
  "autopilot_programs",
  {
    id: text("id").primaryKey(),
    brandId: text("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "cascade" }),
    objective: text("objective").notNull(),
    policy: jsonb("policy").notNull(),
    budget: jsonb("budget").notNull(),
    status: text("status").notNull().default("paused"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("autopilot_programs_brand_id_idx").on(table.brandId)]
);

// ─── Relations ───────────────────────────────────────────────────
export const projectsRelations = relations(projects, ({ many }) => ({
  messages: many(messages),
  assets: many(projectAssets),
  generations: many(generations),
  audioTracks: many(audioTracks),
  generationPlans: many(generationPlans),
  scenes: many(scenes),
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

export const audioTracksRelations = relations(audioTracks, ({ one }) => ({
  project: one(projects, {
    fields: [audioTracks.projectId],
    references: [projects.id],
  }),
}));

export const generationPlansRelations = relations(generationPlans, ({ one }) => ({
  project: one(projects, {
    fields: [generationPlans.projectId],
    references: [projects.id],
  }),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  knowledgeItems: many(knowledgeItems),
  tasteReferences: many(tasteReferences),
  entities: many(entities),
  autopilotPrograms: many(autopilotPrograms),
}));

export const knowledgeItemsRelations = relations(knowledgeItems, ({ one }) => ({
  brand: one(brands, {
    fields: [knowledgeItems.brandId],
    references: [brands.id],
  }),
}));

export const tasteReferencesRelations = relations(tasteReferences, ({ one }) => ({
  brand: one(brands, {
    fields: [tasteReferences.brandId],
    references: [brands.id],
  }),
}));

export const entitiesRelations = relations(entities, ({ one }) => ({
  brand: one(brands, {
    fields: [entities.brandId],
    references: [brands.id],
  }),
}));
