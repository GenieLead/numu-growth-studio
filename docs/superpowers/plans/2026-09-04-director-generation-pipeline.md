# NUMU Director AI — Generation Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an autonomous Director AI that reverse-engineers references, manages assets, and produces optimal video/image generations through VACE (DashScope) and Seedance (OpenRouter).

**Architecture:** The Director AI acts as a production planner — analyzing references, identifying missing assets, guiding casting, and compiling detailed prompts. Generation routes through VACE for editing/reproduction tasks and Seedance for pure generation. The chat workspace handles polling and inline video display.

**Tech Stack:** Next.js 16, Drizzle ORM, Neon DB, OpenRouter (Gemini + Seedance), DashScope (VACE), Vercel Blob

---

## File Structure

### New Files
- `src/lib/dashscope.ts` — DashScope API client for VACE
- `src/lib/generation-router.ts` — Routes tasks to VACE or Seedance based on task type
- `src/lib/prompt-compiler.ts` — Compiles Director analysis into model-optimized prompts
- `src/app/api/projects/[id]/generate-video/route.ts` — Video generation endpoint (VACE + Seedance)
- `src/app/api/projects/[id]/generate-image/route.ts` — Image generation endpoint (for casting)
- `src/app/api/projects/[id]/poll-generation/route.ts` — Poll generation status

### Modified Files
- `src/lib/director-prompt.ts` — Major rewrite: add reference analysis, asset management, generation triggers
- `src/lib/openrouter.ts` — Add image generation function for casting
- `src/app/api/projects/[id]/chat/route.ts` — Wire Director proposals to generation endpoints
- `src/components/chat-workspace.tsx` — Add generation polling and video preview
- `src/components/chat-message.tsx` — Add generation result rendering
- `src/db/schema.ts` — Add generation tracking fields

---

## Task 1: DashScope API Client

**Files:**
- Create: `src/lib/dashscope.ts`

**Interfaces:**
- Produces: `submitVaceTask(params)`, `pollVaceTask(taskId)`, `VaceTaskResult`

- [ ] **Step 1: Create DashScope client**

```typescript
// src/lib/dashscope.ts

const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/api/v1";

export interface VaceTaskParams {
  function: "image_reference" | "video_repainting" | "video_edit" | "video_extension" | "video_outpainting";
  prompt: string;
  videoUrl?: string;
  refImagesUrl?: string[];
  maskImageUrl?: string;
  firstClipUrl?: string;
  // video_repainting specific
  controlCondition?: "depth" | "canny" | "pose";
  // video_outpainting specific
  topScale?: number;
  bottomScale?: number;
  leftScale?: number;
  rightScale?: number;
  // common
  size?: string; // e.g. "1280*720"
  promptExtend?: boolean;
}

export interface VaceTaskResult {
  taskId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
}

export async function submitVaceTask(
  apiKey: string,
  params: VaceTaskParams
): Promise<{ taskId: string }> {
  const input: Record<string, any> = {
    function: params.function,
    prompt: params.prompt,
  };

  if (params.videoUrl) input.video_url = params.videoUrl;
  if (params.refImagesUrl) input.ref_images_url = params.refImagesUrl;
  if (params.maskImageUrl) input.mask_image_url = params.maskImageUrl;
  if (params.firstClipUrl) input.first_clip_url = params.firstClipUrl;

  const parameters: Record<string, any> = {};
  if (params.size) parameters.size = params.size;
  if (params.promptExtend !== undefined) parameters.prompt_extend = params.promptExtend;
  if (params.controlCondition) parameters.control_condition = params.controlCondition;
  if (params.topScale) parameters.top_scale = params.topScale;
  if (params.bottomScale) parameters.bottom_scale = params.bottomScale;
  if (params.leftScale) parameters.left_scale = params.leftScale;
  if (params.rightScale) parameters.right_scale = params.rightScale;

  const res = await fetch(
    `${DASHSCOPE_BASE}/services/aigc/video-generation/video-synthesis`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: "wan2.1-vace-plus",
        input,
        parameters,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DashScope error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return { taskId: data.output.task_id };
}

export async function pollVaceTask(
  apiKey: string,
  taskId: string
): Promise<VaceTaskResult> {
  const res = await fetch(
    `${DASHSCOPE_BASE}/tasks/${taskId}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DashScope poll error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const output = data.output;

  return {
    taskId,
    status: output.status === "SUCCEEDED" ? "completed"
      : output.status === "FAILED" ? "failed"
      : output.status === "RUNNING" ? "in_progress"
      : "queued",
    videoUrl: output.video_url || output.results?.[0]?.url,
    error: output.message,
  };
}
```

- [ ] **Step 2: Verify DashScope API key works**

The user needs a DashScope API key from Alibaba Cloud. Add `.env` variable:
```
DASHSCOPE_API_KEY=your-key-here
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/dashscope.ts
git commit -m "feat: add DashScope API client for VACE video generation"
```

---

## Task 2: OpenRouter Video API Client

**Files:**
- Modify: `src/lib/openrouter.ts`

**Interfaces:**
- Produces: `submitVideoGeneration()`, `pollVideoGeneration()`, `VideoGenResult`

- [ ] **Step 1: Add video generation functions to openrouter.ts**

Append to existing `src/lib/openrouter.ts`:

```typescript
export interface VideoGenParams {
  model: string; // "bytedance/seedance-2.0" or "bytedance/seedance-2.5"
  prompt: string;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  generateAudio?: boolean;
  // Reference-to-video
  inputReferences?: Array<{ type: string; image_url: { url: string } }>;
  // Image-to-video (first/last frame)
  frameImages?: Array<{ type: string; image_url: { url: string }; frame_type: "first_frame" | "last_frame" }>;
  // Video-to-video
  videoUrl?: string;
}

export interface VideoGenResult {
  jobId: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  videoUrl?: string;
  cost?: number;
  error?: string;
}

export async function submitVideoGeneration(
  apiKey: string,
  params: VideoGenParams
): Promise<{ jobId: string; pollingUrl: string }> {
  const body: Record<string, any> = {
    model: params.model,
    prompt: params.prompt,
  };

  if (params.duration) body.duration = params.duration;
  if (params.resolution) body.resolution = params.resolution;
  if (params.aspectRatio) body.aspect_ratio = params.aspectRatio;
  if (params.generateAudio !== undefined) body.generate_audio = params.generateAudio;
  if (params.inputReferences) body.input_references = params.inputReferences;
  if (params.frameImages) body.frame_images = params.frameImages;
  if (params.videoUrl) body.video_url = params.videoUrl;

  const res = await fetch("https://openrouter.ai/api/v1/videos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter video error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return { jobId: data.id, pollingUrl: data.polling_url };
}

export async function pollVideoGeneration(
  apiKey: string,
  jobId: string
): Promise<VideoGenResult> {
  const res = await fetch(`https://openrouter.ai/api/v1/videos/${jobId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter poll error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return {
    jobId,
    status: data.status,
    videoUrl: data.unsigned_urls?.[0],
    cost: data.usage?.cost,
    error: data.error,
  };
}

export async function getVideoModels(apiKey: string): Promise<any[]> {
  const res = await fetch("https://openrouter.ai/api/v1/videos/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/openrouter.ts
git commit -m "feat: add OpenRouter video generation API for Seedance"
```

---

## Task 3: Generation Router

**Files:**
- Create: `src/lib/generation-router.ts`

**Interfaces:**
- Consumes: `submitVaceTask()`, `submitVideoGeneration()`, `getOpenRouterKey()`
- Produces: `routeGeneration()`, `GenerationRoute`

- [ ] **Step 1: Create generation router**

```typescript
// src/lib/generation-router.ts
import { getOpenRouterKey } from "./openrouter";
import { submitVideoGeneration, type VideoGenParams } from "./openrouter";
import { submitVaceTask, type VaceTaskParams } from "./dashscope";

export type TaskType =
  | "reference_to_video"    // User has reference video + assets → VACE R2V or Seedance R2V
  | "video_restyle"         // Restyle existing video → VACE video_repainting
  | "object_swap"           // Replace character/product in video → VACE video_edit
  | "video_extend"          // Extend video duration → VACE video_extension
  | "text_to_video"         // No reference → Seedance T2V
  | "image_to_video"        // Animate a still → Seedance I2V
  | "image_generation";     // Generate character/product for casting → OpenRouter image

export interface GenerationRequest {
  taskType: TaskType;
  prompt: string;
  // Reference assets
  referenceVideoUrl?: string;
  referenceImageUrls?: string[];
  // User assets to inject
  characterImageUrl?: string;
  productImageUrl?: string;
  locationImageUrl?: string;
  // Output settings
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  // Mask for VACE editing
  maskImageUrl?: string;
}

export interface RoutedGeneration {
  provider: "dashscope" | "openrouter";
  taskId: string;
  model: string;
  estimatedCost?: number;
}

export async function routeGeneration(
  userId: string,
  request: GenerationRequest
): Promise<RoutedGeneration> {
  const orKey = await getOpenRouterKey(userId);

  // Route based on task type
  switch (request.taskType) {
    case "object_swap":
    case "video_restyle":
    case "video_extend": {
      // VACE tasks require DashScope key
      const dsKey = process.env.DASHSCOPE_API_KEY;
      if (!dsKey) throw new Error("DashScope API key not configured");

      const vaceParams: VaceTaskParams = {
        function: request.taskType === "video_extend" ? "video_extension"
          : request.taskType === "video_restyle" ? "video_repainting"
          : "video_edit",
        prompt: request.prompt,
        videoUrl: request.referenceVideoUrl,
        refImagesUrl: request.referenceImageUrls,
        maskImageUrl: request.maskImageUrl,
        size: request.aspectRatio === "9:16" ? "720*1280" : "1280*720",
      };

      const result = await submitVaceTask(dsKey, vaceParams);
      return {
        provider: "dashscope",
        taskId: result.taskId,
        model: "wan2.1-vace-plus",
      };
    }

    case "reference_to_video": {
      // Use Seedance 2.5 R2V if we have OpenRouter key
      if (orKey) {
        const params: VideoGenParams = {
          model: "bytedance/seedance-2.5",
          prompt: request.prompt,
          duration: request.duration || 10,
          resolution: request.resolution || "720p",
          aspectRatio: request.aspectRatio || "16:9",
          inputReferences: request.referenceImageUrls?.map((url) => ({
            type: "image_url",
            image_url: { url },
          })),
        };
        const result = await submitVideoGeneration(orKey, params);
        return {
          provider: "openrouter",
          taskId: result.jobId,
          model: "bytedance/seedance-2.5",
        };
      }
      // Fallback to VACE
      const dsKey = process.env.DASHSCOPE_API_KEY;
      if (!dsKey) throw new Error("No API key available");
      const vaceResult = await submitVaceTask(dsKey, {
        function: "image_reference",
        prompt: request.prompt,
        refImagesUrl: request.referenceImageUrls,
        size: request.aspectRatio === "9:16" ? "720*1280" : "1280*720",
      });
      return { provider: "dashscope", taskId: vaceResult.taskId, model: "wan2.1-vace-plus" };
    }

    case "text_to_video": {
      if (!orKey) throw new Error("OpenRouter key required for text-to-video");
      const params: VideoGenParams = {
        model: "bytedance/seedance-2.0",
        prompt: request.prompt,
        duration: request.duration || 10,
        resolution: request.resolution || "720p",
        aspectRatio: request.aspectRatio || "16:9",
      };
      const result = await submitVideoGeneration(orKey, params);
      return { provider: "openrouter", taskId: result.jobId, model: "bytedance/seedance-2.0" };
    }

    case "image_to_video": {
      if (!orKey) throw new Error("OpenRouter key required for image-to-video");
      const firstFrame = request.characterImageUrl || request.referenceImageUrls?.[0];
      if (!firstFrame) throw new Error("Need at least one image for I2V");
      const params: VideoGenParams = {
        model: "bytedance/seedance-2.0",
        prompt: request.prompt,
        duration: request.duration || 10,
        resolution: request.resolution || "720p",
        aspectRatio: request.aspectRatio || "16:9",
        frameImages: [{ type: "image_url", image_url: { url: firstFrame }, frame_type: "first_frame" }],
      };
      const result = await submitVideoGeneration(orKey, params);
      return { provider: "openrouter", taskId: result.jobId, model: "bytedance/seedance-2.0" };
    }

    case "image_generation": {
      // Use OpenRouter image model for casting
      if (!orKey) throw new Error("OpenRouter key required for image generation");
      // This will use the existing callDirector or a dedicated image endpoint
      throw new Error("Image generation not yet implemented — use callDirector with image model");
    }

    default:
      throw new Error(`Unknown task type: ${request.taskType}`);
  }
}

export async function pollGeneration(
  provider: "dashscope" | "openrouter",
  apiKey: string,
  taskId: string
) {
  if (provider === "dashscope") {
    const { pollVaceTask } = await import("./dashscope");
    return pollVaceTask(apiKey, taskId);
  } else {
    const { pollVideoGeneration } = await import("./openrouter");
    return pollVideoGeneration(apiKey, taskId);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/generation-router.ts
git commit -m "feat: add generation router for VACE and Seedance task routing"
```

---

## Task 4: Upgrade Director System Prompt

**Files:**
- Modify: `src/lib/director-prompt.ts`

**Interfaces:**
- Consumes: (nothing — standalone prompt)
- Produces: Updated `DIRECTOR_SYSTEM_PROMPT` used by `callDirector()`

- [ ] **Step 1: Rewrite Director prompt**

Replace entire `DIRECTOR_SYSTEM_PROMPT` with a structured prompt that handles:

1. **Reference Analysis**: When user shares video/image, reverse-engineer shot structure, motion, camera, timing, subjects, lighting
2. **Asset Casting**: Identify what assets exist vs what's needed. If character needed but not provided → ask for reference or offer to generate
3. **Task Detection**: Determine if this is R2V, V2V, object_swap, T2V, I2V, or image-only
4. **Generation Proposal**: When ready to generate, output a structured JSON block with task_type, prompt, references, assets, settings
5. **Image-Only Mode**: Some projects only need images (storyboards, casting sheets) — detect and handle

The key sections of the new prompt:

```
You are the Director — an autonomous AI production studio...

## REFERENCE ANALYSIS
When user shares a reference (image or video):
- Analyze: shot structure, timing, camera movement, subjects, lighting, mood
- Classify: PRESERVE (motion, camera, timing), REPLACE (character, product, location), REINTERPRET (style, mood)
- Ask about anything unclear before proceeding

## ASSET MANAGEMENT
Before any generation, verify all required assets exist:
- CHARACTER: Who appears? Do we have their image? If not → ask user to upload OR offer to generate
- PRODUCT: What product? Do we have its image? If not → ask user to upload
- LOCATION: Where does this take place? Do we have a location image?
- CLOTHING/STYLE: What are they wearing? Describe or show reference

If any required asset is missing:
1. Ask user to upload it
2. If user can't provide, offer to generate it (you'll call image generation)
3. Wait for user approval before proceeding

## GENERATION PLANNING
When all assets are ready and direction is confirmed, output a generation plan:

<generation_plan>
{
  "task_type": "reference_to_video|video_restyle|object_swap|video_extend|text_to_video|image_to_video",
  "prompt": "detailed production prompt with camera, motion, lighting, timing",
  "reference_urls": ["url1", "url2"],
  "asset_urls": {
    "character": "url",
    "product": "url",
    "location": "url"
  },
  "settings": {
    "duration": 10,
    "resolution": "720p",
    "aspect_ratio": "16:9"
  },
  "estimated_credits": 1.2,
  "model_recommendation": "standard|premium"
}
</generation_plan>

Only output this when user explicitly confirms "generate" or "go ahead".

## IMAGE-ONLY MODE
If the project is about creating images (storyboard, casting, product shots):
- Use image generation to create assets
- Show results inline
- User can approve and save as project assets
- Never force video generation if user only wants images

## VOICE
Brief. No headings in regular responses. No filler.
When presenting analysis: structured and precise.
When asking questions: one at a time, high-value only.
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/director-prompt.ts
git commit -m "feat: upgrade Director prompt with reference analysis, asset casting, and generation planning"
```

---

## Task 5: Wire Chat Route to Generation

**Files:**
- Modify: `src/app/api/projects/[id]/chat/route.ts`

**Interfaces:**
- Consumes: `callDirector()`, `routeGeneration()`, `DIRECTOR_SYSTEM_PROMPT`
- Produces: Chat response with optional `generationPlan` field

- [ ] **Step 1: Add generation detection to chat route**

Modify the POST handler in `src/app/api/projects/[id]/chat/route.ts`:

After getting the Director response, check if it contains a `<generation_plan>` block. If so:

1. Parse the JSON from the generation plan
2. Save a system message with the plan
3. Return the plan to the frontend along with the text

```typescript
// After getting response from callDirector:
const responseText = response.text;

// Check for generation plan
const planMatch = responseText.match(/<generation_plan>([\s\S]*?)<\/generation_plan>/);
let generationPlan = null;

if (planMatch) {
  try {
    generationPlan = JSON.parse(planMatch[1]);
    // Remove the plan block from displayed text
    responseText = responseText.replace(/<generation_plan>[\s\S]*?<\/generation_plan>/, "").trim();
  } catch (e) {
    console.error("Failed to parse generation plan:", e);
  }
}

// Save assistant message (without the plan block)
const assistantMsgId = crypto.randomUUID();
await db.insert(messages).values({
  id: assistantMsgId,
  projectId,
  role: "assistant",
  content: responseText,
  createdAt: new Date(),
});

return Response.json({
  text: responseText,
  model: response.model,
  messageId: assistantMsgId,
  generationPlan, // Frontend uses this to show "Generate" button
});
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/projects/[id]/chat/route.ts
git commit -m "feat: wire chat route to detect and return generation plans"
```

---

## Task 6: Generation API Endpoint

**Files:**
- Create: `src/app/api/projects/[id]/generate-video/route.ts`

**Interfaces:**
- Consumes: `routeGeneration()`, `getOpenRouterKey()`
- Produces: Generation job ID + polling info

- [ ] **Step 1: Create generation endpoint**

```typescript
// src/app/api/projects/[id]/generate-video/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { generations, costLedger } from "@/db/schema";
import { routeGeneration, type GenerationRequest, type TaskType } from "@/lib/generation-router";
import { getOpenRouterKey } from "@/lib/openrouter";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    projectId,
    taskType,
    prompt,
    referenceVideoUrl,
    referenceImageUrls,
    characterImageUrl,
    productImageUrl,
    locationImageUrl,
    duration,
    resolution,
    aspectRatio,
    maskImageUrl,
  } = body;

  if (!projectId || !taskType || !prompt) {
    return NextResponse.json({ error: "projectId, taskType, and prompt required" }, { status: 400 });
  }

  try {
    const result = await routeGeneration(user.id, {
      taskType: taskType as TaskType,
      prompt,
      referenceVideoUrl,
      referenceImageUrls,
      characterImageUrl,
      productImageUrl,
      locationImageUrl,
      duration,
      resolution,
      aspectRatio,
      maskImageUrl,
    });

    // Save generation record
    const genId = crypto.randomUUID();
    await db.insert(generations).values({
      id: genId,
      projectId,
      model: result.model,
      provider: result.provider,
      intent: taskType.toUpperCase(),
      compiledPrompt: prompt,
      requestPayload: body,
      openrouterJobId: result.provider === "openrouter" ? result.taskId : null,
      pollingUrl: result.provider === "openrouter"
        ? `https://openrouter.ai/api/v1/videos/${result.taskId}`
        : `dashscope:${result.taskId}`,
      status: "pending",
      estimatedCost: result.estimatedCost || 0,
      maxApprovedCost: 0,
      createdAt: new Date(),
    });

    return NextResponse.json({
      generationId: genId,
      provider: result.provider,
      taskId: result.taskId,
      model: result.model,
      status: "pending",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create polling endpoint**

```typescript
// src/app/api/projects/[id]/poll-generation/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { generations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { pollGeneration } from "@/lib/generation-router";
import { getOpenRouterKey } from "@/lib/openrouter";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const generationId = searchParams.get("generationId");
  if (!generationId) return NextResponse.json({ error: "generationId required" }, { status: 400 });

  // Get generation record
  const gen = await db.select().from(generations).where(eq(generations.id, generationId)).limit(1);
  if (gen.length === 0) return NextResponse.json({ error: "Generation not found" }, { status: 404 });

  const generation = gen[0];
  const provider = generation.provider as "dashscope" | "openrouter";

  // Get the appropriate API key
  let apiKey: string;
  if (provider === "dashscope") {
    apiKey = process.env.DASHSCOPE_API_KEY || "";
  } else {
    const orKey = await getOpenRouterKey(user.id);
    if (!orKey) return NextResponse.json({ error: "OpenRouter key not connected" }, { status: 400 });
    apiKey = orKey;
  }

  // Extract task ID from polling URL
  let taskId: string;
  if (provider === "dashscope") {
    taskId = generation.pollingUrl?.replace("dashscope:", "") || "";
  } else {
    taskId = generation.openrouterJobId || "";
  }

  if (!taskId) return NextResponse.json({ error: "No task ID found" }, { status: 400 });

  try {
    const result = await pollGeneration(provider, apiKey, taskId);

    // Update generation record
    await db.update(generations).set({
      status: result.status,
      ...(result.videoUrl ? { outputAssetId: null } : {}),
      ...(result.error ? { errorMessage: result.error } : {}),
      ...(result.status === "completed" ? { completedAt: new Date() } : {}),
    }).where(eq(generations.id, generationId));

    return NextResponse.json({
      status: result.status,
      videoUrl: result.videoUrl,
      error: result.error,
      cost: result.cost,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/projects/[id]/generate-video/route.ts src/app/api/projects/[id]/poll-generation/route.ts
git commit -m "feat: add video generation and polling endpoints"
```

---

## Task 7: Frontend Generation Display

**Files:**
- Modify: `src/components/chat-workspace.tsx`
- Modify: `src/components/chat-message.tsx`

**Interfaces:**
- Consumes: `generationPlan` from chat response
- Produces: Generation polling UI, video preview in chat

- [ ] **Step 1: Add generation state to chat workspace**

In `chat-workspace.tsx`, add state for active generation:

```typescript
const [activeGeneration, setActiveGeneration] = useState<{
  generationId: string;
  provider: string;
  taskId: string;
  model: string;
  status: string;
  videoUrl?: string;
} | null>(null);
```

- [ ] **Step 2: Handle generation plan from chat response**

When the chat API returns a `generationPlan`, show it in the chat as a proposal card with a "Generate" button. When user clicks generate:

```typescript
const handleGenerate = async (plan: any) => {
  const res = await fetch(`/api/projects/${projectId}/generate-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      projectId,
      ...plan,
    }),
  });

  if (res.ok) {
    const data = await res.json();
    setActiveGeneration({
      generationId: data.generationId,
      provider: data.provider,
      taskId: data.taskId,
      model: data.model,
      status: "pending",
    });
    // Start polling
    startPolling(data.generationId);
  }
};
```

- [ ] **Step 3: Add polling logic**

```typescript
const startPolling = (generationId: string) => {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/projects/${projectId}/poll-generation?generationId=${generationId}`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      setActiveGeneration((prev) => prev ? { ...prev, status: data.status, videoUrl: data.videoUrl } : null);

      if (data.status === "completed" || data.status === "failed") {
        clearInterval(interval);
        if (data.status === "completed" && data.videoUrl) {
          // Add generation result as a message in chat
          const resultMsg: Message = {
            id: `gen-${Date.now()}`,
            role: "assistant",
            content: { type: "generation_result", videoUrl: data.videoUrl, model: activeGeneration?.model },
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, resultMsg]);
        }
      }
    }
  }, 5000); // Poll every 5 seconds
};
```

- [ ] **Step 4: Render generation status in chat**

Add to the chat message rendering a new component for generation results:

```typescript
// In chat-message.tsx, add a new case for generation results:
if (typeof content === "object" && content !== null && (content as any).type === "generation_result") {
  return (
    <div className="flex gap-3 py-3">
      <div className="h-8 w-8 rounded-full bg-accent-lime flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-black" />
      </div>
      <div className="max-w-[80%]">
        <video
          src={(content as any).videoUrl}
          className="w-full max-w-md rounded-lg border border-neutral-700"
          controls
          playsInline
        />
        <p className="text-xs text-neutral-500 mt-1">Generated with {(content as any).model}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/chat-workspace.tsx src/components/chat-message.tsx
git commit -m "feat: add generation polling and video preview in chat"
```

---

## Task 8: Director Prompt — Production Modes

**Files:**
- Modify: `src/lib/director-prompt.ts`

**Interfaces:**
- Consumes: (standalone)
- Produces: Updated prompt with mode detection

- [ ] **Step 1: Add mode detection to Director prompt**

The Director must detect the project mode and adjust behavior:

**Video Production Mode** (default):
- Analyzes references for video reproduction
- Plans shots, camera, timing
- Generates video through VACE or Seedance

**Image Production Mode** (when user says "photos", "images", "storyboard", "casting"):
- Only generates images
- Creates character sheets, product shots, location scouts
- Never proposes video generation

**Editing Mode** (when user has existing footage):
- V2V through VACE
- Object swap, style transfer
- Extend or outpaint

Add to the Director prompt:

```
## MODE DETECTION
Detect the project mode from user intent:

VIDEO MODE: "make a video", "animate this", "create an ad", reference video shared
→ Plan for video generation. Analyze reference. Route to VACE (editing) or Seedance (generation).

IMAGE MODE: "create images", "storyboard", "casting", "product shots", "need photos"
→ Only generate images. Never propose video. Create character sheets, location scouts, product photos.

EDITING MODE: "edit this footage", "change the character", "swap the product", "extend this"
→ VACE video_repainting or video_edit. Requires source video + reference images.

MIXED MODE: "first get the images right, then animate"
→ Start in image mode, transition to video after assets are approved.

When uncertain, ask one clarifying question:
"What are we making — images, a video, or both?"
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/director-prompt.ts
git commit -m "feat: add production mode detection to Director (video/image/editing)"
```

---

## Task 9: Environment Setup & Integration Test

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Update .env.example**

```
# Existing
OPENROUTER_API_KEY=...
NEXT_PUBLIC_APP_URL=...

# New - DashScope (for VACE)
DASHSCOPE_API_KEY=your-alibaba-cloud-dashscope-key
```

- [ ] **Step 2: Test the full flow**

1. User opens project, uploads reference video
2. Director analyzes reference, identifies what to preserve/replace
3. Director asks for missing assets (character image, product image)
4. User uploads assets or approves generated ones
5. Director proposes generation with structured plan
6. User confirms → generation submits
7. Chat shows polling status
8. Video appears inline when complete

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: update env example with DashScope API key"
```

---

## Testing Checklist

- [ ] Director correctly identifies R2V vs V2V vs T2V vs I2V tasks
- [ ] Director asks for missing assets before proposing generation
- [ ] Director generates character images when user can't provide references
- [ ] Generation plan JSON is valid and parseable
- [ ] VACE tasks submit and poll correctly via DashScope
- [ ] Seedance tasks submit and poll correctly via OpenRouter
- [ ] Video results display inline in chat
- [ ] Generation errors are handled gracefully
- [ ] Image-only mode works without video generation
- [ ] Director never mentions model names to the user
