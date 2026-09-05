# Phase 1: HAYK Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand numu-growth-studio to HAYK, extend database schema, add brand/entity management, improve library UI, add @mention support, and set up the Director Agent personality.

**Architecture:** Extend the existing numu-growth-studio codebase (Next.js 16, React 19, Drizzle + Neon, better-auth, Vercel Blob). Add new DB tables, API routes, and UI components. Rebrand all user-facing text from NUMU to HAYK.

**Tech Stack:** Next.js 16.3.4, React 19, TypeScript 5, Tailwind CSS 4, Drizzle ORM, Neon PostgreSQL, better-auth, Vercel Blob, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-09-05-hayk-platform-design.md`

## Global Constraints

- Next.js 16.3.4 has breaking changes from older versions — check `node_modules/next/dist/docs/` before writing code
- Never expose model/provider names to end users
- Dark theme only (`className="dark"` on html)
- Accent color: `bg-accent-lime` (#D8FF3E)
- All API routes use `getSessionUser(request)` pattern from existing code
- Never spend meaningful credits silently
- All mutations must be idempotent where practical
- Use existing `cn()` utility from `src/lib/utils.ts`

## File Structure

### New Files
- `src/db/schema.ts` — extend with new tables (brands, knowledge_items, taste_references, entities, entity_assets, feedback_events)
- `src/app/api/brands/route.ts` — brand CRUD
- `src/app/api/brands/[id]/knowledge/route.ts` — knowledge items
- `src/app/api/brands/[id]/taste/route.ts` — taste references
- `src/app/api/entities/route.ts` — entity CRUD
- `src/app/api/entities/[id]/assets/route.ts` — entity-asset linking
- `src/components/library/projects-tab.tsx` — extracted projects tab
- `src/components/library/assets-tab.tsx` — extracted assets tab
- `src/components/brand/brand-onboarding.tsx` — first-run brand setup modal
- `src/types/brand.ts` — brand/entity types

### Modified Files
- `src/app/layout.tsx` — metadata title NUMU → HAYK
- `src/components/app-shell.tsx` — logo text NUMU → HAYK
- `src/app/page.tsx` — landing page text NUMU → HAYK
- `src/app/login/page.tsx` — branding text
- `src/app/signup/page.tsx` — branding text
- `src/lib/director-prompt.ts` — HAYK personality + brand context injection
- `src/app/library/page.tsx` — refactor to use extracted components, add brand onboarding
- `src/components/chat-composer.tsx` — enhance @mention to search saved entities

---

### Task 1: Database Schema Extension

**Files:**
- Modify: `src/db/schema.ts`

**Interfaces:**
- Produces: `brands`, `knowledgeItems`, `tasteReferences`, `entities`, `entityAssets`, `feedbackEvents` tables + relations

- [ ] **Step 1: Add new tables to schema.ts**

Add the following tables after the existing `audioTracks` table and before the `Relations` section:

```typescript
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
```

- [ ] **Step 2: Add brand_id and category columns to existing tables**

Modify the `projects` table definition — add `brandId` and `parentProjectId`:

```typescript
brandId: text("brand_id"),
parentProjectId: text("parent_project_id"),
```

Modify the `assets` table definition — add `brandId`, `category`, `libraryVisible`, `checksum`:

```typescript
brandId: text("brand_id"),
category: text("category"), // replaces kind for library filtering
libraryVisible: boolean("library_visible").default(true).notNull(),
checksum: text("checksum"),
```

- [ ] **Step 3: Add relations for new tables**

```typescript
export const brandsRelations = relations(brands, ({ many }) => ({
  knowledgeItems: many(knowledgeItems),
  tasteReferences: many(tasteReferences),
  entities: many(entities),
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
```

- [ ] **Step 4: Run Drizzle generate and push**

```bash
cd /Users/shabamedchiheb/Documents/Default\ Project/numu-growth-studio
npx drizzle-kit generate
npx drizzle-kit push
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

---

### Task 2: Brand CRUD API Routes

**Files:**
- Create: `src/app/api/brands/route.ts`
- Create: `src/app/api/brands/[id]/knowledge/route.ts`
- Create: `src/app/api/brands/[id]/taste/route.ts`
- Create: `src/types/brand.ts`

**Interfaces:**
- Consumes: `getSessionUser()` from `src/lib/auth.ts`, db from `src/db/index.ts`, schema from `src/db/schema.ts`
- Produces: GET/POST/PATCH/DELETE `/api/brands`, GET/POST/DELETE `/api/brands/[id]/knowledge`, GET/POST/DELETE `/api/brands/[id]/taste`

- [ ] **Step 1: Create brand types**

```typescript
// src/types/brand.ts
export interface Brand {
  id: string;
  userId: string;
  name: string;
  positioning: string | null;
  personality: string | null;
  visualSystem: string | null;
  toneOfVoice: string | null;
  values: string | null;
  rules: { approvedClaims?: string[]; forbiddenClaims?: string[]; legalNotes?: string[] } | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeItem {
  id: string;
  brandId: string;
  sourceType: string;
  title: string;
  rawAssetId: string | null;
  textContent: string | null;
  trustLevel: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface TasteReference {
  id: string;
  brandId: string;
  assetId: string | null;
  url: string | null;
  roles: string[];
  notes: string | null;
  preferenceWeight: number;
  createdAt: string;
}
```

- [ ] **Step 2: Create brands API route**

```typescript
// src/app/api/brands/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(brands)
    .where(and(eq(brands.userId, user.id), eq(brands.deletedAt, null as any)))
    .orderBy(desc(brands.updatedAt));

  return NextResponse.json({ brands: rows });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const id = randomUUID();
  const now = new Date().toISOString();

  await db.insert(brands).values({
    id,
    userId: user.id,
    name: body.name || "My Brand",
    positioning: body.positioning || null,
    personality: body.personality || null,
    visualSystem: body.visualSystem || null,
    toneOfVoice: body.toneOfVoice || null,
    values: body.values || null,
    rules: body.rules || null,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ brand: { id, name: body.name || "My Brand" } });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Missing brand id" }, { status: 400 });

  await db
    .update(brands)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.positioning !== undefined && { positioning: body.positioning }),
      ...(body.personality !== undefined && { personality: body.personality }),
      ...(body.visualSystem !== undefined && { visualSystem: body.visualSystem }),
      ...(body.toneOfVoice !== undefined && { toneOfVoice: body.toneOfVoice }),
      ...(body.values !== undefined && { values: body.values }),
      ...(body.rules !== undefined && { rules: body.rules }),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(brands.id, body.id), eq(brands.userId, user.id)));

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db
    .update(brands)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(brands.id, id), eq(brands.userId, user.id)));

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create knowledge items API route**

```typescript
// src/app/api/brands/[id]/knowledge/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { knowledgeItems, brands } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify brand ownership
  const brand = await db.select().from(brands).where(and(eq(brands.id, id), eq(brands.userId, user.id))).limit(1);
  if (brand.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await db
    .select()
    .from(knowledgeItems)
    .where(and(eq(knowledgeItems.brandId, id), eq(knowledgeItems.deletedAt, null as any)));

  return NextResponse.json({ items });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const brand = await db.select().from(brands).where(and(eq(brands.id, id), eq(brands.userId, user.id))).limit(1);
  if (brand.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const itemId = randomUUID();

  await db.insert(knowledgeItems).values({
    id: itemId,
    brandId: id,
    sourceType: body.sourceType || "upload",
    title: body.title,
    rawAssetId: body.rawAssetId || null,
    textContent: body.textContent || null,
    trustLevel: body.trustLevel || "user",
    metadata: body.metadata || null,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ item: { id: itemId, title: body.title } });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "Missing itemId" }, { status: 400 });

  await db
    .update(knowledgeItems)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(knowledgeItems.id, itemId), eq(knowledgeItems.brandId, id)));

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Create taste references API route**

```typescript
// src/app/api/brands/[id]/taste/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasteReferences, brands } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const brand = await db.select().from(brands).where(and(eq(brands.id, id), eq(brands.userId, user.id))).limit(1);
  if (brand.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const refs = await db.select().from(tasteReferences).where(eq(tasteReferences.brandId, id));
  return NextResponse.json({ references: refs });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const brand = await db.select().from(brands).where(and(eq(brands.id, id), eq(brands.userId, user.id))).limit(1);
  if (brand.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const refId = randomUUID();

  await db.insert(tasteReferences).values({
    id: refId,
    brandId: id,
    assetId: body.assetId || null,
    url: body.url || null,
    roles: body.roles || [],
    notes: body.notes || null,
    preferenceWeight: body.preferenceWeight || 1.0,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ reference: { id: refId } });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const refId = searchParams.get("refId");
  if (!refId) return NextResponse.json({ error: "Missing refId" }, { status: 400 });

  await db.delete(tasteReferences).where(and(eq(tasteReferences.id, refId), eq(tasteReferences.brandId, id)));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

---

### Task 3: Entity CRUD API Routes

**Files:**
- Create: `src/app/api/entities/route.ts`
- Create: `src/app/api/entities/[id]/assets/route.ts`

**Interfaces:**
- Produces: GET/POST/PATCH/DELETE `/api/entities`, GET/POST/DELETE `/api/entities/[id]/assets`

- [ ] **Step 1: Create entities API route**

```typescript
// src/app/api/entities/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { entities, brands } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  const type = searchParams.get("type");

  if (!brandId) return NextResponse.json({ error: "Missing brandId" }, { status: 400 });

  // Verify brand ownership
  const brand = await db.select().from(brands).where(and(eq(brands.id, brandId), eq(brands.userId, user.id))).limit(1);
  if (brand.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const conditions = [eq(entities.brandId, brandId), eq(entities.status, "active")];
  if (type) conditions.push(eq(entities.type, type));

  const rows = await db.select().from(entities).where(and(...conditions));
  return NextResponse.json({ entities: rows });
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.brandId) return NextResponse.json({ error: "Missing brandId" }, { status: 400 });

  // Verify brand ownership
  const brand = await db.select().from(brands).where(and(eq(brands.id, body.brandId), eq(brands.userId, user.id))).limit(1);
  if (brand.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const id = randomUUID();
  const now = new Date().toISOString();

  await db.insert(entities).values({
    id,
    brandId: body.brandId,
    type: body.type,
    name: body.name,
    canonicalDescription: body.canonicalDescription || null,
    rules: body.rules || null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ entity: { id, name: body.name } });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Missing entity id" }, { status: 400 });

  await db
    .update(entities)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.canonicalDescription !== undefined && { canonicalDescription: body.canonicalDescription }),
      ...(body.rules !== undefined && { rules: body.rules }),
      ...(body.status !== undefined && { status: body.status }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(entities.id, body.id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Soft delete
  await db.update(entities).set({ status: "deleted" }).where(eq(entities.id, id));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create entity assets API route**

```typescript
// src/app/api/entities/[id]/assets/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { entityAssets, entities } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rows = await db.select().from(entityAssets).where(eq(entityAssets.entityId, id));
  return NextResponse.json({ assets: rows });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  await db.insert(entityAssets).values({
    entityId: id,
    assetId: body.assetId,
    role: body.role || "reference",
    approved: body.approved !== false,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId");
  if (!assetId) return NextResponse.json({ error: "Missing assetId" }, { status: 400 });

  await db.delete(entityAssets).where(and(eq(entityAssets.entityId, id), eq(entityAssets.assetId, assetId)));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

---

### Task 4: Rebrand UI Text (NUMU → HAYK)

**Files:**
- Modify: `src/app/layout.tsx:19` — metadata title
- Modify: `src/components/app-shell.tsx:64` — logo text
- Modify: `src/app/page.tsx` — landing page (if present)
- Modify: `src/app/login/page.tsx` — branding
- Modify: `src/app/signup/page.tsx` — branding
- Modify: `src/lib/director-prompt.ts:6` — "you are NUMU"

**Interfaces:**
- Consumes: none
- Produces: All user-facing text says HAYK instead of NUMU

- [ ] **Step 1: Update layout metadata**

In `src/app/layout.tsx`, change:
```typescript
title: "NUMU — AI Production Studio",
description: "Create high-quality brand images and videos through one intelligent conversation.",
```
to:
```typescript
title: "HAYK — AI Creative Director",
description: "The studio lens between imagination and fascination.",
```

- [ ] **Step 2: Update app shell logo**

In `src/components/app-shell.tsx`, change:
```tsx
<Link href="/library" className="text-lg font-semibold tracking-tight">
  NUMU
</Link>
```
to:
```tsx
<Link href="/library" className="text-lg font-semibold tracking-tight">
  HAYK
</Link>
```

- [ ] **Step 3: Update director prompt**

In `src/lib/director-prompt.ts`, change:
```
To the user, you are NUMU — nothing more.
```
to:
```
To the user, you are HAYK — nothing more.
```

- [ ] **Step 4: Check and update any other NUMU references**

Search for remaining "NUMU" or "numu" references in user-facing text across the codebase and update them.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

---

### Task 5: Library UI Refactor — Projects Tab + Assets Tab Extraction

**Files:**
- Create: `src/components/library/projects-tab.tsx`
- Create: `src/components/library/assets-tab.tsx`
- Modify: `src/app/library/page.tsx` — use extracted components

**Interfaces:**
- Consumes: Project[], Asset[] from parent state
- Produces: Cleaner library page with better separation

- [ ] **Step 1: Create projects-tab component**

Extract the Projects tab content from `library/page.tsx` into a dedicated component. This keeps the existing functionality (grid, rename, delete, duplicate) but moves it to its own file.

- [ ] **Step 2: Create assets-tab component**

Extract the Assets tab content (filter bar, grid, bulk operations, upload) into its own component.

- [ ] **Step 3: Refactor library page to use extracted components**

Replace inline tab content with `<ProjectsTab>` and `<AssetsTab>` components.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

---

### Task 6: Chat Composer — Enhanced @Mention with Saved Entities

**Files:**
- Modify: `src/components/chat-composer.tsx`

**Interfaces:**
- Consumes: entities API, assets API
- Produces: @mention menu that searches both named references AND saved entities

- [ ] **Step 1: Add entity fetching to composer**

Add a `useEffect` that fetches entities when the composer mounts (if brandId is available). Store them in state.

- [ ] **Step 2: Extend @mention search**

Update the `filteredRefs` logic to also search entities by name. When an entity is selected, insert `@EntityName` with entity metadata attached to the message.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

---

### Task 7: Director Prompt — Brand Context Injection

**Files:**
- Modify: `src/lib/director-prompt.ts`

**Interfaces:**
- Consumes: Brand data, entity data
- Produces: Updated system prompt that includes brand context when available

- [ ] **Step 1: Add brand context parameter**

Modify the `DIRECTOR_SYSTEM_PROMPT` to accept a function that generates brand context:

```typescript
export function buildDirectorPrompt(brandContext?: {
  name: string;
  positioning?: string;
  personality?: string;
  products?: string[];
}): string {
  let prompt = DIRECTOR_SYSTEM_PROMPT;
  if (brandContext) {
    prompt += `\n\n--- BRAND CONTEXT ---\nBrand: ${brandContext.name}`;
    if (brandContext.positioning) prompt += `\nPositioning: ${brandContext.positioning}`;
    if (brandContext.personality) prompt += `\nPersonality: ${brandContext.personality}`;
    if (brandContext.products?.length) prompt += `\nProducts: ${brandContext.products.join(", ")}`;
  }
  return prompt;
}
```

- [ ] **Step 2: Update chat route to pass brand context**

In the chat API route, fetch the brand associated with the project and pass it to `buildDirectorPrompt`.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

---

### Task 8: Brand Onboarding Modal

**Files:**
- Create: `src/components/brand/brand-onboarding.tsx`

**Interfaces:**
- Consumes: `/api/brands` POST
- Produces: Modal component that shows on first visit when no brand exists

- [ ] **Step 1: Create onboarding modal**

A simple modal that appears when a user has no brand. It asks:
- Brand name (required)
- Optional: positioning, personality, tone of voice, values

Has a "Skip for now" option.

- [ ] **Step 2: Add to library page**

Show the onboarding modal when the library page loads and no brand exists for the user.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

---

### Task 9: Update Project API — Brand Filtering and Remix

**Files:**
- Modify: `src/app/api/projects/route.ts`

**Interfaces:**
- Consumes: brands table
- Produces: Projects filtered by brandId, remix support (parent_project_id)

- [ ] **Step 1: Add brand_id filtering to GET**

When `brandId` query param is provided, filter projects by brand.

- [ ] **Step 2: Add remix support to POST**

When `remixFromId` is provided, create a new project with `parentProjectId` set and copy the production graph from the source project.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

---

### Task 10: Update Asset API — Category Support

**Files:**
- Modify: `src/app/api/assets/route.ts`
- Modify: `src/app/api/assets/upload/route.ts`

**Interfaces:**
- Consumes: new `category` column on assets
- Produces: Assets with proper category, filtered by category

- [ ] **Step 1: Add category to asset PATCH**

Support updating `category` alongside `kind`.

- [ ] **Step 2: Add category to upload response**

Return `category` in the upload response (same as `kind` for backward compat).

- [ ] **Step 3: Add category filtering to GET**

Support `category` query param filter.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

---

### Task 11: Full Build Verification

- [ ] **Step 1: Run full build**

```bash
npm run build
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Test key flows manually**

- Login/signup works
- Library loads with Projects/Assets tabs
- Can create/rename/delete projects
- Can upload/organize assets by category
- Brand onboarding modal appears for new users
- Chat works with HAYK branding
- @mention shows saved entities

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: Phase 1 — HAYK foundation, brand/entity schema, rebranded UI, library refactor"
```
