# HAYK Platform Design Spec

**Date:** 5 September 2026
**Status:** Design spec for full build
**Foundation:** numu-growth-studio (Next.js 16, React 19, Drizzle + Neon, Vercel Blob, better-auth)
**Theme:** Dark neutral + lime accent (existing)

---

## 1. Product Identity

- **Brand:** NUMU
- **Agent:** HAYK — the AI creative director
- **Tagline:** "The studio lens between imagination and fascination"
- **Product claim discipline:** "Hollywood-level" is a quality bar, not a guaranteed output promise

## 2. Architecture Overview

### 2.1 What We Keep From numu-growth-studio

| Component | Status | Notes |
|-----------|--------|-------|
| better-auth (email/password) | Keep | Already working, 7-day sessions |
| Drizzle + Neon PostgreSQL | Keep | 14 tables, well-structured |
| Vercel Blob + proxy | Keep | Private file storage with signed URLs |
| Dark + lime theme | Keep | Matches PRD reference screenshots |
| shadcn/ui components | Keep | Button, Card, Dialog, Tabs, etc. |
| Chat workspace + composer | Keep | Refactor for @mentions, categories |
| Generation routing | Keep | OpenRouter + DashScope |
| Video trimmer | Keep | Already has max-duration enforcement |
| Voice recorder | Keep | MediaRecorder API |
| Audio timeline | Keep | Multi-track visualization |

### 2.2 What We Add

- 15+ new database tables (brands, entities, knowledge, scenes, timelines, social, etc.)
- RAG pipeline (embeddings + pgvector + hybrid retrieval)
- Entity passport system
- ProductionGraph state machine
- Director Agent personality + skill system
- Reference analysis engine
- Reference-transform compiler
- Creator Studio Lens (raw footage analysis)
- QC + repair system
- Social publishing adapters
- Performance tracking
- Autopilot policies
- Admin model console

### 2.3 Tech Stack (No Changes)

```
Next.js 16.3.4 (App Router)
React 19
TypeScript 5
Tailwind CSS 4
Drizzle ORM + Neon PostgreSQL (pgvector)
better-auth
Vercel Blob
OpenRouter (primary model gateway)
DashScope/VACE (secondary video editing)
```

---

## 3. Database Schema Extensions

### 3.1 New Tables

#### `brands`
```sql
id              text primary key
user_id         text not null references user(id)
name            text not null
positioning     text
personality     text
visual_system   text
tone_of_voice   text
values          text
rules           jsonb  -- approved/forbidden claims, legal notes
created_at      text not null
updated_at      text not null
deleted_at      text
```

#### `knowledge_items`
```sql
id              text primary key
brand_id        text not null references brands(id)
source_type     text not null  -- document, url, upload
title           text not null
raw_asset_id    text references assets(id)
text_content    text
trust_level     text not null default 'user'  -- user, verified, system
metadata        jsonb
embedding       vector(1536)
deleted_at      text
```

#### `taste_references`
```sql
id              text primary key
brand_id        text not null references brands(id)
asset_id        text references assets(id)
url             text
roles           jsonb  -- ["cinematography", "lighting", "motion"]
notes           text
preference_weight real default 1.0
created_at      text not null
```

#### `entities`
```sql
id              text primary key
brand_id        text not null references brands(id)
type            text not null  -- character, product, location, costume, prop, voice, style
name            text not null
canonical_description text
rules           jsonb  -- consistency rules, approved angles, etc.
status          text not null default 'active'
created_at      text not null
updated_at      text not null
```

#### `entity_assets`
```sql
entity_id       text not null references entities(id)
asset_id        text not null references assets(id)
role            text not null  -- front, side, macro, reference, approved
approved        boolean default true
primary key (entity_id, asset_id)
```

#### `scenes`
```sql
id              text primary key
project_id      text not null references projects(id)
order_index     integer not null
title           text
duration_sec    real
state           jsonb  -- ContinuityBundle: previous clip, last frame, character, product, etc.
created_at      text not null
updated_at      text not null
```

#### `shots`
```sql
id              text primary key
scene_id        text not null references scenes(id)
start_sec       real not null
end_sec         real not null
state           jsonb  -- camera, lighting, audio state per shot
```

#### `timelines`
```sql
id              text primary key
project_id      text not null references projects(id)
version         integer not null default 1
state           jsonb  -- tracks: V1/V2/V3, A1-A6
parent_timeline_id text references timelines(id)
created_at      text not null
```

#### `edit_operations`
```sql
id              text primary key
timeline_id     text not null references timelines(id)
operation_type  text not null  -- trim, reorder, split, overlay, etc.
payload         jsonb
created_by      text not null  -- user or agent
created_at      text not null
```

#### `annotations`
```sql
id              text primary key
project_id      text not null references projects(id)
generation_id   text references generations(id)
source_asset_id text not null references assets(id)
time_sec        real not null
clean_frame_asset_id    text references assets(id)
annotated_frame_asset_id text references assets(id)
geometry        jsonb  -- draw/shapes data
note            text
created_at      text not null
```

#### `social_accounts`
```sql
id              text primary key
user_id         text not null references user(id)
platform        text not null  -- instagram, tiktok, youtube
encrypted_tokens text not null
external_account_id text not null
status          text not null default 'active'
created_at      text not null
```

#### `social_posts`
```sql
id              text primary key
project_id      text not null references projects(id)
asset_id        text not null references assets(id)
platform        text not null
external_post_id text
objective       text
caption         text
published_at    text
status          text not null  -- scheduled, published, failed
```

#### `performance_snapshots`
```sql
id              text primary key
social_post_id  text not null references social_posts(id)
captured_at     text not null
metrics         jsonb  -- views, likes, shares, saves, completion, etc.
normalized_score real
```

#### `creative_features`
```sql
asset_id        text primary key references assets(id)
features        jsonb  -- hook_type, face_no_face, shot_density, etc.
```

#### `feedback_events`
```sql
id              text primary key
user_id         text not null references user(id)
project_id      text references projects(id)
asset_id        text references assets(id)
event_type      text not null  -- approve, reject, revision, publish, performance
reason          text
metadata        jsonb
created_at      text not null
```

#### `autopilot_programs`
```sql
id              text primary key
brand_id        text not null references brands(id)
objective       text
policy          jsonb  -- approval levels, channels, output types
budget          jsonb  -- monthly/weekly limits
status          text not null default 'paused'
created_at      text not null
updated_at      text not null
```

### 3.2 Existing Table Modifications

#### `projects`
Add columns:
```sql
brand_id              text references brands(id)
parent_project_id     text references projects(id)  -- for remix branching
target_budget_credits real
credits_spent         real default 0
```
Expand existing `status` column values from just `"draft"` to: `draft | producing | review | approved | published | error`

#### `assets`
Rename existing `kind` column to `category` (same values: character, product, location, costume, prop, style, reference, image, video, audio). Add new values: `voice, music, audio_sfx, knowledge`. Add columns:
```sql
brand_id              text references brands(id)
library_visible       boolean default true
checksum              text
```

#### `generations`
Add columns:
```sql
scene_id              text references scenes(id)
internal_route_id     text
estimated_credits     real
approved_max_credits  real
actual_credits        real
error                 jsonb
```

### 3.3 Vector Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
-- knowledge_items.embedding uses vector(1536)
```

---

## 4. API Route Map

### 4.1 Existing Routes (Keep, Minor Updates)

| Route | Changes |
|-------|---------|
| `/api/auth/[...all]` | None |
| `/api/settings` | Add brand_id scope |
| `/api/projects` | Add brand filtering, remix, parent_project_id |
| `/api/projects/[id]/chat` | Refactor for Director Agent + skill loading |
| `/api/projects/[id]/messages` | Add message_type variants (plan, approval, qc) |
| `/api/projects/[id]/generate` | Add scene support, multi-pass |
| `/api/projects/[id]/generate-video` | Add reference-transform routing |
| `/api/assets` | Add category filtering, multi-select |
| `/api/assets/upload` | Add brand_id, category |

### 4.2 New Routes

#### Brand / Knowledge
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/brands` | GET/POST/PATCH | Brand CRUD |
| `/api/brands/[id]/knowledge` | GET/POST/DELETE | Knowledge items |
| `/api/brands/[id]/taste` | GET/POST/DELETE | Taste references |
| `/api/brands/[id]/knowledge/search` | POST | Hybrid retrieval (RAG) |

#### Entities
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/entities` | GET/POST/PATCH/DELETE | Entity CRUD |
| `/api/entities/[id]/assets` | GET/POST/DELETE | Entity asset linking |

#### Reference Analysis
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/projects/[id]/analyze-reference` | POST | Video/image analysis |
| `/api/projects/[id]/trim` | POST | Inline trim save |

#### Production
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/projects/[id]/production-graph` | GET/PATCH | ProductionGraph CRUD |
| `/api/projects/[id]/scenes` | GET/POST | Scene management |
| `/api/projects/[id]/scenes/[sid]/shots` | GET/POST | Shot management |
| `/api/projects/[id]/render-plan` | POST | Render plan + cost estimate |
| `/api/projects/[id]/approve` | POST | Cost/spend approval |

#### QC + Repair
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/projects/[id]/qc` | POST | Run QC on generation |
| `/api/projects/[id]/repair` | POST | Localized repair plan |

#### Editor
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/projects/[id]/timeline` | GET/PATCH | Timeline state |
| `/api/projects/[id]/timeline/edit` | POST | Edit operation |
| `/api/projects/[id]/annotations` | GET/POST | Frame annotations |
| `/api/projects/[id]/export` | POST | Export/FCPXML |

#### Sound / Voice / Music
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/projects/[id]/voice/generate` | POST | AI voiceover |
| `/api/projects/[id]/voice/clone` | POST | Voice cloning |
| `/api/projects/[id]/music/generate` | POST | Music generation |
| `/api/projects/[id]/audio/mix` | POST | Final mix |

#### Social
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/social/accounts` | GET/POST/DELETE | Platform connections |
| `/api/social/publish` | POST | Publish asset |
| `/api/social/posts` | GET | Post status + metrics |

#### Performance
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/social/posts/[id]/metrics` | GET | Performance snapshot |
| `/api/brands/[id]/performance/insights` | GET | Creative performance insights |

#### Autopilot
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/autopilot` | GET/POST/PATCH | Autopilot program CRUD |

---

## 5. Director Agent Architecture

### 5.1 Personality System

The Master Director has one consistent voice across all modes:

- **Tone:** calm, elegant, confident, observant, concise, visually literate, never overexcited
- **Default response:** 1-3 short sentences
- **Operational status:** brief progress events only ("Reading the reference...", "Found 9 cuts.")

### 5.2 Expertise Inference

Internal `expertise_profile` inferred from language:

| Signal | Beginner | Expert |
|--------|----------|--------|
| Vocabulary | Plain-language goals | Timecodes, lens, blocking, grade |
| Questions | "What is possible?" | "Protect the first two cuts" |
| Assets | Incomplete | Specific references |
| Behavior | Offer small choices, translate | Use technical vocabulary, expose detail |

### 5.3 High-Value Questioning

- One question at a time
- Must remove meaningful uncertainty, improve quality, prevent wasted spend
- Never ask for data already in Brand Brain, Production Memory, uploads, or conversation

### 5.4 Skill System

Skills are versioned knowledge packages loaded by intent:

```
/skills
  /master-director         -- core personality + decision loop
  /commercial-director     -- commercial/cinema production
  /ugc-director            -- UGC transformation
  /cinematography          -- camera, lighting, composition
  /product-photography     -- product image workflows
  /reference-transform     -- Genjutsu-class core
  /seedance-compiler       -- Seedance-specific prompt compilation
  /open-video-edit-compiler
  /hollywood-editor        -- timeline editing, cuts, pacing
  /sound-director          -- audio mixing, sound design
  /voice-director          -- voiceover, voice cloning
  /music-director          -- music generation, library
  /performance-marketing   -- creative performance optimization
  /social-publisher        -- platform publishing
  /creative-analytics      -- performance tracking
  /qc-video                -- video quality control
  /qc-image                -- image quality control
  /safety                  -- content policy
```

Each skill defines: role, when to load, required context, principles, tool permissions, output schema, failure modes, version.

### 5.5 Decision Loop

For each user turn:
1. Parse new information and media
2. Update ProductionGraph
3. Infer expertise level
4. Identify active production stage
5. Retrieve relevant Brand/Taste/Project context
6. Load minimum required skills
7. Determine single largest unresolved decision
8. Choose one action: ask, infer, propose, analyze, create, edit, repair, continue, publish, or export
9. If money may be spent, estimate cost + require approval
10. Respond with fewest words that move production forward

---

## 6. ProductionGraph

The chat transcript is NOT the project state. The ProductionGraph is:

```typescript
type ProductionGraph = {
  version: number;
  goal: {
    outputType?: "image" | "video" | "campaign";
    objective?: string;
    audience?: string;
    desiredResponse?: string;
    durationSec?: number;
    aspectRatio?: string;
    budgetCredits?: number;
  };
  creativeDirection: {
    emotion?: string;
    tone?: string;
    visualWorld?: string;
    pacing?: string;
    mustHave: string[];
    mustAvoid: string[];
  };
  references: ReferenceNode[];
  entities: EntityNode[];
  scenes: SceneNode[];
  audio: AudioState;
  locks: {
    preserve: string[];
    change: string[];
  };
  currentPlan?: RenderPlan;
  latestApprovedAssetIds: string[];
};
```

Every tool mutates this graph. Prompts are compiled from it.

---

## 7. Reference Transform (Genjutsu-Class)

### 7.1 Flow

1. User uploads/references video
2. HAYK analyzes: cuts, shots, entities, editingDNA
3. User says what to change
4. HAYK builds Preserve/Change/Reinterpret map
5. Surgical prompt compiler builds model-specific spec
6. Router selects Plan A/B/C/D
7. Async generation
8. QC checks non-target preservation, identity, product, contact, continuity
9. Localized repair if needed

### 7.2 Reference Analysis Schema

```typescript
type ReferenceAnalysis = {
  durationSec: number;
  cuts: number[];
  shots: ShotAnalysis[];
  recurringEntities: {
    id: string;
    type: "person" | "product" | "object" | "location";
    appearanceWindows: TimeRange[];
  }[];
  editingDNA: {
    pacing: string;
    transitions: string;
    cameraLanguage: string;
    lightingLanguage: string;
    soundLanguage?: string;
  };
};
```

### 7.3 Router

Each task class maps to ranked candidates:

```
SURGICAL_VIDEO_EDIT
Plan A = strongest closed reference-edit route (Seedance 2.5)
Plan B = alternate closed route
Plan C = VACE / localized open route
Plan D = segmented multi-pass repair route
```

Scoring: capability gate → quality benchmark → non-target preservation → reliability → cost → latency.

---

## 8. Creator Studio Lens

### 8.1 RawFootageAnalysis

```typescript
type RawFootageAnalysis = {
  story: { what: string; beats: string[]; hookOpportunities: string[] };
  people: PersonAnalysis[];
  objects: ObjectAnalysis[];
  world: WorldAnalysis;
  camera: CameraAnalysis;
  audio: AudioAnalysis;
  editingOpportunities: EditingOpportunity[];
};
```

### 8.2 Routes

- **A. Premium finish only** — trim, grade, sound (cheapest)
- **B. Keep creator, rebuild world** — preserve face/body/voice, change location/wardrobe
- **C. Keep performance, replace identity** — synthetic character, keep motion/timing
- **D. Reference-guided transformation** — apply reference grammar to user footage
- **E. Story rescue** — reconstruct from strongest moments

---

## 9. UI Changes

### 9.1 Library View

- Two top-level tabs: Projects | Assets
- Project cards: thumbnail, title, status, credits, last updated, ellipsis menu
- Asset grid: category filter bar, multi-select, bulk actions
- Brand onboarding modal (first run)

### 9.2 Chat Enhancements

- @ mention autocomplete (searchable asset picker)
- Upload cards with name + category selector before send
- Generation plan cards with cost estimate + approve/reject
- QC report cards with repair suggestions
- Timeline view (collapsible) for edit operations
- Frame annotation overlay (draw, rectangle, arrow, text)

### 9.3 Settings

- Brand management section
- Knowledge base upload
- Social account connections
- Autopilot configuration

### 9.4 Naming

- All "NUMU" references → "HAYK" in UI text
- "numu-growth-studio" directory/package name stays

---

## 10. Phase 1 Detailed Scope

Phase 1 is the foundation everything else builds on.

### Database
- Add `brands` table
- Add `knowledge_items` table with pgvector
- Add `taste_references` table
- Add `entities` + `entity_assets` tables
- Extend `projects` with brand_id, parent_project_id, status, credits
- Extend `assets` with category, library_visible, checksum
- Enable pgvector extension

### Auth + Settings
- No changes (keep better-auth as-is)

### API Routes
- `/api/brands` — CRUD
- `/api/brands/[id]/knowledge` — list, upload, delete
- `/api/brands/[id]/taste` — list, add, delete
- `/api/entities` — CRUD
- `/api/entities/[id]/assets` — link/unlink
- Update `/api/projects` — brand filtering, remix
- Update `/api/assets` — category filtering

### UI
- Rebrand all "NUMU" text → "HAYK"
- Library page: Projects tab + Assets tab
- Project cards with status, credits, actions
- Asset grid with category filter bar
- Upload cards with name/category in chat
- @ mention autocomplete in composer
- Project delete confirmation dialog
- Brand onboarding modal
- Settings: brand management section

### Chat
- Update Director prompt for HAYK personality
- Add brand context injection to chat
- Basic expertise inference

---

## 11. Testing Strategy

### Unit
- ProductionGraph state reducers
- Expertise inference rules
- Cost estimation
- Router hard gates
- Prompt compiler
- Asset reference counts
- Project delete semantics
- Permission checks

### Integration (mock providers)
- Successful generation flow
- Provider failure → Plan B
- Fallback over cost cap → ask approval
- Duplicate webhook handling
- Asset referenced in multiple projects
- RAG scope leakage

### E2E
1. Signup/login
2. Create brand
3. Upload product/knowledge
4. Create project
5. Upload reference + trim
6. Attach character/product/location
7. Compile plan
8. Approve mocked cost
9. Receive render
10. Frame-annotate repair
11. Remix project
12. Reuse asset via @mention
13. Record VO
14. Publish mocked social asset

---

## 12. Non-Negotiable Rules

1. One chat is the primary creation interface
2. Never force mode selection when intent can be inferred
3. Never expose model/provider names to ordinary users
4. Never spend meaningful credits silently
5. Never overwrite an approved generation/edit
6. Never lose a project on refresh/navigation
7. Always prefer localized repair to full rerender
8. Always make cost and approval state obvious
9. Always maintain provenance
10. Models are hidden, benchmarked, and replaceable

---

## 13. File Structure (Target)

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/route.ts
│   │   ├── brands/route.ts
│   │   ├── brands/[id]/knowledge/route.ts
│   │   ├── brands/[id]/taste/route.ts
│   │   ├── brands/[id]/knowledge/search/route.ts
│   │   ├── entities/route.ts
│   │   ├── entities/[id]/assets/route.ts
│   │   ├── projects/route.ts
│   │   ├── projects/[id]/
│   │   │   ├── chat/route.ts
│   │   │   ├── messages/route.ts
│   │   │   ├── generate/route.ts
│   │   │   ├── generate-video/route.ts
│   │   │   ├── production-graph/route.ts
│   │   │   ├── scenes/route.ts
│   │   │   ├── scenes/[sid]/shots/route.ts
│   │   │   ├── render-plan/route.ts
│   │   │   ├── approve/route.ts
│   │   │   ├── qc/route.ts
│   │   │   ├── repair/route.ts
│   │   │   ├── timeline/route.ts
│   │   │   ├── timeline/edit/route.ts
│   │   │   ├── annotations/route.ts
│   │   │   ├── voice/generate/route.ts
│   │   │   ├── music/generate/route.ts
│   │   │   ├── audio/mix/route.ts
│   │   │   ├── export/route.ts
│   │   │   ├── analyze-reference/route.ts
│   │   │   └── audio/tracks/route.ts
│   │   ├── assets/route.ts
│   │   ├── assets/upload/route.ts
│   │   ├── assets/presign/route.ts
│   │   ├── assets/signed-url/route.ts
│   │   ├── assets/proxy/route.ts
│   │   ├── settings/route.ts
│   │   ├── social/accounts/route.ts
│   │   ├── social/publish/route.ts
│   │   ├── social/posts/[id]/metrics/route.ts
│   │   └── autopilot/route.ts
│   ├── library/page.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── projects/[id]/page.tsx
│   ├── settings/page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx
├── components/
│   ├── app-shell.tsx
│   ├── chat-workspace.tsx
│   ├── chat-composer.tsx
│   ├── chat-message.tsx
│   ├── library/
│   │   ├── projects-tab.tsx
│   │   ├── assets-tab.tsx
│   │   ├── project-card.tsx
│   │   ├── asset-grid.tsx
│   │   ├── asset-category-bar.tsx
│   │   └── delete-confirm-dialog.tsx
│   ├── brand/
│   │   ├── brand-onboarding.tsx
│   │   ├── brand-settings.tsx
│   │   └── knowledge-upload.tsx
│   ├── entities/
│   │   ├── entity-card.tsx
│   │   ├── entity-picker.tsx
│   │   └── passport-viewer.tsx
│   ├── production/
│   │   ├── generation-plan-card.tsx
│   │   ├── cost-estimate-card.tsx
│   │   ├── qc-report-card.tsx
│   │   ├── timeline-view.tsx
│   │   └── frame-annotator.tsx
│   ├── media/
│   │   ├── reference-card.tsx
│   │   ├── media-preview-card.tsx
│   │   ├── video-trimmer.tsx
│   │   ├── video-player.tsx
│   │   ├── audio-timeline.tsx
│   │   ├── voice-recorder.tsx
│   │   └── generation-result.tsx
│   ├── social/
│   │   ├── publish-card.tsx
│   │   └── performance-card.tsx
│   └── ui/  (shadcn — existing)
├── db/
│   ├── index.ts
│   └── schema.ts
├── drizzle/
├── lib/
│   ├── auth.ts
│   ├── auth-client.ts
│   ├── utils.ts
│   ├── openrouter.ts
│   ├── dashscope.ts
│   ├── generation-router.ts
│   ├── director-prompt.ts
│   ├── editor-skill.ts
│   ├── sound-director.ts
│   ├── production-graph.ts
│   ├── video-models.ts
│   ├── video-frames.ts
│   ├── rag/
│   │   ├── embeddings.ts
│   │   ├── retrieval.ts
│   │   ├── context-compiler.ts
│   │   └── injection-guard.ts
│   ├── director/
│   │   ├── personality.ts
│   │   ├── expertise-inference.ts
│   │   ├── decision-loop.ts
│   │   ├── question-policy.ts
│   │   └── skill-loader.ts
│   ├── reference/
│   │   ├── analyzer.ts
│   │   ├── trimmer.ts
│   │   ├── prompt-compiler.ts
│   │   └── preserve-change-map.ts
│   ├── creator-studio/
│   │   ├── raw-footage-analyzer.ts
│   │   ├── preserve-transform-finish.ts
│   │   └── route-selector.ts
│   ├── editor/
│   │   ├── timeline-model.ts
│   │   ├── edit-operations.ts
│   │   └── self-review.ts
│   ├── qc/
│   │   ├── video-qc.ts
│   │   ├── image-qc.ts
│   │   └── repair-planner.ts
│   ├── social/
│   │   ├── instagram-adapter.ts
│   │   ├── tiktok-adapter.ts
│   │   └── youtube-adapter.ts
│   └── cost/
│       ├── cost-engine.ts
│       └── approval-policy.ts
├── skills/
│   ├── master-director/SKILL.md
│   ├── commercial-director/SKILL.md
│   ├── reference-transform/SKILL.md
│   ├── editor/SKILL.md
│   ├── sound-director/SKILL.md
│   ├── qc-video/SKILL.md
│   └── ...
└── types/
    ├── production-graph.ts
    ├── reference-analysis.ts
    ├── raw-footage.ts
    ├── entity.ts
    ├── brand.ts
    └── timeline.ts
```
