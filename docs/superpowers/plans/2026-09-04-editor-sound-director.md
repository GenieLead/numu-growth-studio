# NUMU Editor Skill + Sound Director — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Editor Skill and Sound Director that let users edit generated videos through conversation — frame selection, targeted edits, voiceover, music, and sound — without regenerating everything.

**Architecture:** The Director AI gains an Editor Skill that understands video editing language. For frame-level edits, it routes to VACE's video_edit function with masks. For audio, we use cloud APIs (TTS, transcription) and FFmpeg for processing. The user sees none of this — they just talk.

**Tech Stack:** VACE (DashScope) for video editing, OpenRouter (Gemini) for Director intelligence, Web Audio API for recording, FFmpeg for audio processing, Cloud TTS APIs for voiceover

---

## Architecture Overview

### What the user sees:
```
User: "Make it more intense"
Director: Interprets → shortens buildup, adjusts timing, suggests changes

User: "At 8 seconds I want a heavy impact"
Director: Adds SFX at timestamp

User: "Give it a calm female narrator"
Director: Generates voiceover, mixes with video

User: "Keep her talking but change the music"
Director: Separates stems, replaces music, re-mixes
```

### What happens internally:
```
                    DIRECTOR
                       │
          ┌────────────┼────────────┐
          │            │            │
       EDITOR      SOUND DIR    COLORIST
          │            │          (future)
          │       ┌────┼────┐
          │    VOICE  MUSIC  SFX
          │       │     │     │
          └───────┴─────┴─────┘
                  ↓
            FINAL OUTPUT
```

### MVP Scope (this plan):
1. **Editor Skill** — Frame selection + targeted VACE edits
2. **Voice Recording** — Browser mic → clean audio
3. **Voiceover Generation** — TTS via cloud API
4. **Basic Audio Mixing** — FFmpeg-based ducking, levels
5. **Director Prompt** — Understands editing language

### Future (separate plans):
- Music generation (ACE-Step)
- Stem separation (Demucs/AudioSep)
- Sound effects library
- Color grading notes
- Full timeline UI

---

## File Structure

### New Files
- `src/lib/editor-skill.ts` — Editor Skill prompt + tools
- `src/lib/sound-director.ts` — Sound Director prompt + tools
- `src/lib/audio-utils.ts` — FFmpeg audio processing helpers
- `src/lib/tts-client.ts` — Text-to-speech API client
- `src/lib/transcription.ts` — Whisper/transcription client
- `src/app/api/projects/[id]/audio/record/route.ts` — Save recorded audio
- `src/app/api/projects/[id]/audio/tts/route.ts` — Generate voiceover
- `src/app/api/projects/[id]/audio/mix/route.ts` — Mix audio tracks
- `src/components/voice-recorder.tsx` — Updated recorder with cleanup
- `src/components/audio-timeline.tsx` — Simple audio track display

### Modified Files
- `src/lib/director-prompt.ts` — Add Editor Skill + Sound Director knowledge
- `src/lib/dashscope.ts` — Add video_edit with mask support
- `src/components/chat-workspace.tsx` — Frame selection UI, audio controls
- `src/db/schema.ts` — Audio track table

---

## Task 1: Editor Skill — Prompt + Frame Selection

**Files:**
- Create: `src/lib/editor-skill.ts`
- Modify: `src/lib/director-prompt.ts`

**Interfaces:**
- Produces: `EDITOR_SKILL_PROMPT` — appended to Director system prompt

- [ ] **Step 1: Create Editor Skill prompt**

```typescript
// src/lib/editor-skill.ts

export const EDITOR_SKILL_PROMPT = `

## EDITOR SKILL

You are also an elite film editor. When the user wants to edit an existing video (not regenerate), use these capabilities:

### FRAME-LEVEL EDITING
When user says "at X seconds", "in frame Y", "around the 5 second mark":
1. Identify the exact timestamp
2. Determine what needs to change (character, object, background, style)
3. Use video editing (not regeneration) to make targeted changes
4. Preserve everything else

### EDITING COMMANDS YOU UNDERSTAND

**Timing edits:**
- "Shorten the buildup" → Compress early section, keep reveal
- "Hold this shot longer" → Extend specific moment
- "Speed up the middle" → Time-remap section
- "Add a pause before the reveal" → Insert beat

**Visual edits:**
- "Change the background at 5s" → VACE video_edit with mask
- "Replace the character" → VACE object swap
- "Make the lighting warmer" → Style transfer note
- "Add a zoom at the impact" → Camera movement note

**Composition:**
- "Start tighter" → Adjust first frame crop
- "Wider shot at the end" → Adjust final frame
- "Cut to black after the logo" → Add transition

### HOW TO EDIT WITHOUT REGENERATING

When user wants a targeted change:
1. ASK: "What exactly should change at [timestamp]?"
2. IDENTIFY: The specific element (character, object, background, style)
3. PRESERVE: Everything else in the frame
4. EDIT: Use VACE video_edit with precise mask/prompt
5. SHOW: Present the edited result

NEVER regenerate the whole video for a small change.
NEVER say "I'll regenerate the entire video."
ALWAYS say "I'll change [specific thing] at [timestamp] while keeping everything else."

### EDITING WORKFLOW

User: "The character at 3 seconds is wrong"
Director: "I see — at 3 seconds the character should be [description]. I'll replace just that character while keeping the motion, background, and timing identical. Ready?"

User: "Yes"
Director: → Calls VACE video_edit with source video + mask at 3s + character reference

### FRAME SELECTION

When user says "select a frame" or "pick the best shot":
1. Analyze the video for key moments
2. Suggest 3-5 best frames with timestamps
3. User picks one
4. Use that frame as reference for edits or as a still export

### CONTINUITY CHECKS

Before any edit, verify:
- Motion continuity (does the edit preserve movement?)
- Lighting consistency (does the new element match the scene light?)
- Scale accuracy (is the replacement the right size?)
- Edge quality (are there visible seams?)

If any check fails, note it and suggest fixes.

### VOICE AND AUDIO EDITING

When user mentions audio:
- "Add voiceover" → Route to Sound Director
- "Change the music" → Route to Sound Director
- "Remove the background noise" → Route to Sound Director
- "Add sound effects" → Route to Sound Director
- "Lower the music when she speaks" → Route to Sound Director (ducking)

You interpret the creative intent. The Sound Director handles execution.

### STYLE TRANSFER

When user says "make it look like [reference]":
1. Analyze the reference for visual style (color, contrast, grain, mood)
2. Apply as style notes to the video
3. Use VACE video_repainting if major style change needed
4. Use color grading notes for subtle adjustments

### PROFESSIONAL EDITING LANGUAGE

Understand and use these terms:
- J-cut: Audio leads video (hear next scene before seeing it)
- L-cut: Video leads audio (see next scene before hearing it)
- Cut on action: Cut during movement for seamless transition
- Match cut: Cut between visually similar compositions
- Jump cut: Skip time within same shot
- Smash cut: Abrupt transition for impact
- Cross-dissolve: Overlapping transition
- Beat: A rhythmic unit in the edit
- In point: Where a clip starts
- Out point: Where a clip ends
- Handle: Extra footage before in/out for flexibility

When user uses these terms, understand and execute them.
When user doesn't know these terms, interpret their intent and execute.
`;
```

- [ ] **Step 2: Append to Director prompt**

In `src/lib/director-prompt.ts`, import and append:

```typescript
import { EDITOR_SKILL_PROMPT } from "./editor-skill";

export const DIRECTOR_SYSTEM_PROMPT = `...existing prompt...

${EDITOR_SKILL_PROMPT}
`;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/editor-skill.ts src/lib/director-prompt.ts
git commit -m "feat: add Editor Skill with frame-level editing and professional editing language"
```

---

## Task 2: Sound Director — Prompt + Audio Operations

**Files:**
- Create: `src/lib/sound-director.ts`
- Modify: `src/lib/director-prompt.ts`

**Interfaces:**
- Produces: `SOUND_DIRECTOR_PROMPT` — appended to Director system prompt

- [ ] **Step 1: Create Sound Director prompt**

```typescript
// src/lib/sound-director.ts

export const SOUND_DIRECTOR_PROMPT = `

## SOUND DIRECTOR

You are also an expert sound director. You understand voice, music, sound effects, and mixing. You translate creative audio intent into technical operations.

### VOICE / NARRATION

When user says:
- "Give it a calm female narrator" → Generate TTS voiceover
- "Use my voice" → Clone from recorded sample
- "Make it sound more confident" → Adjust TTS parameters
- "Add a whisper at the end" → Specific delivery instruction

**Voice Direction Template** (internal, never show to user):
\`\`\`
VOICE
gender: female
age: early 30s
register: low
tone: restrained confidence
quality: warm but unsentimental
pacing: slow first sentence, small breath before product name, firmer final line
microphone: close
style: not announcer, conversational cinematic
\`\`\`

**Voice Router** (internal decision):
- English cinematic VO → Qwen3-TTS (best quality)
- Multilingual / cloning → Chatterbox (23+ languages)
- Quick draft → Chatterbox Nano (fast, CPU-capable)

### MUSIC / SCORE

When user says:
- "I want music that starts mysterious and becomes powerful" → Generate score brief
- "Use something cinematic" → Search music library
- "Lower the music when she speaks" → Auto-ducking
- "Add a beat drop at the reveal" → SFX + music edit

**Music Brief Template** (internal):
\`\`\`
00–03s: almost silent, low drone, desert wind
03–07s: introduce pulse, 74 BPM, muted percussion
07–09s: tension rise
09.2s: hard low-frequency impact (product reveal)
09.2–12s: open harmonic resolution
\`\`\`

**Music Router** (internal decision):
- Original score → ACE-Step (generate from brief)
- Existing music → Openverse/FreePD library search
- User's music → Import and edit

### SOUND EFFECTS

When user says:
- "Add a heavy impact at 8 seconds" → Place SFX at timestamp
- "Whoosh when the logo appears" → Transition SFX
- "Footsteps on sand" → Environmental SFX
- "Remove the traffic noise" → AudioSep separation

**Shot-by-Shot SFX Analysis** (internal):
For each shot, identify needed sounds:
- Cloth movement
- Footsteps
- Object contact
- Room tone
- Environmental ambience
- Impacts
- Breathing
- Vehicle sounds

### AUDIO MIXING

When user says:
- "The music is too strong" → Reduce music level
- "Make her voice clearer" → EQ + compression on voice
- "Add reverb to the narration" → Spatial processing
- "Make it louder" → Mastering/normalization

**Mix Architecture** (internal):
\`\`\`
V1  VIDEO
A1  DIALOGUE (original)
A2  VOICEOVER (generated)
A3  MUSIC
A4  AMBIENCE
A5  FOLEY
A6  IMPACTS
A7  OTHER
\`\`\`

**Auto-Processing** (always applied):
- Auto-ducking: Music drops -6dB when voice present
- Leveling: All voice tracks normalized to -14 LUFS
- Fading: 0.3s fade-in/fade-out on all clips
- Cleanup: Noise suppression on recorded audio

### AUDIO SEPARATION

When user says:
- "Keep her talking but change the music" → Demucs/AudioSep split → replace music
- "Remove the background noise" → Noise suppression
- "Isolate the dialogue" → Vocal extraction

**Separation Flow**:
1. Analyze audio content
2. Separate stems (vocals, music, effects)
3. Apply requested changes to specific stems
4. Re-mix with original untouched stems

### MASTERING

Before final export, always:
1. Normalize loudness to -14 LUFS (streaming standard)
2. Apply gentle compression
3. Check stereo balance
4. Apply fade-in/fade-out
5. Export at correct sample rate (48kHz)

### PROFESSIONAL AUDIO LANGUAGE

Understand these terms:
- Ducking: Auto-reduce music under dialogue
- Compressor: Reduce dynamic range
- EQ: Adjust frequency balance
- Reverb: Add space/depth
- Limiter: Prevent clipping
- LUFS: Loudness units (streaming standard is -14)
- Stem: Individual track from a mix
- Foley: Custom sound effects recorded to picture
- Room tone: Ambient silence of a location
- ADR: Automated dialogue replacement
- L-cut / J-cut: Audio leads or lags video edit
- Sidechain: One audio signal controls another (auto-ducking)
- Noise gate: Silence below threshold

### CRITICAL RULES

1. NEVER generate audio without user approval
2. ALWAYS ask "Want me to generate this?" before TTS/music
3. ALWAYS preserve original dialogue unless user says to change it
4. ALWAYS auto-duck music under voice (user shouldn't need to ask)
5. ALWAYS clean recorded audio before mixing
6. ALWAYS show/hear result before finalizing
`;
```

- [ ] **Step 2: Append to Director prompt**

In `src/lib/director-prompt.ts`:

```typescript
import { EDITOR_SKILL_PROMPT } from "./editor-skill";
import { SOUND_DIRECTOR_PROMPT } from "./sound-director";

export const DIRECTOR_SYSTEM_PROMPT = `...existing prompt...

${EDITOR_SKILL_PROMPT}

${SOUND_DIRECTOR_PROMPT}
`;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/sound-director.ts src/lib/director-prompt.ts
git commit -m "feat: add Sound Director with voice, music, SFX, and mixing knowledge"
```

---

## Task 3: Audio Database Schema

**Files:**
- Modify: `src/db/schema.ts`

**Interfaces:**
- Produces: `audioTracks` table

- [ ] **Step 1: Add audio tracks table**

Append to `src/db/schema.ts`:

```typescript
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
    metadata: jsonb("metadata"), // { transcription, voice_params, source, etc. }
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audio_tracks_project_id_idx").on(table.projectId),
  ]
);
```

Also add relation:

```typescript
export const audioTracksRelations = relations(audioTracks, ({ one }) => ({
  project: one(projects, {
    fields: [audioTracks.projectId],
    references: [projects.id],
  }),
}));
```

And add to projectsRelations:

```typescript
export const projectsRelations = relations(projects, ({ many }) => ({
  messages: many(messages),
  assets: many(projectAssets),
  generations: many(generations),
  audioTracks: many(audioTracks),
}));
```

- [ ] **Step 2: Generate and push migration**

```bash
cd "/Users/shabamedchiheb/Documents/Default Project/numu-growth-studio"
npm run db:generate
npm run db:push
```

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add audio tracks schema for voiceover, music, SFX"
```

---

## Task 4: Voice Recording — Browser → Clean Audio

**Files:**
- Modify: `src/components/voice-recorder.tsx` (existing — enhance)
- Create: `src/app/api/projects/[id]/audio/record/route.ts`

**Interfaces:**
- Consumes: Vercel Blob storage
- Produces: Saved audio asset linked to project

- [ ] **Step 1: Update voice recorder to save to project**

The existing voice-recorder.tsx already records audio. Update it to:
1. Save the recording as an asset in the project
2. Auto-clean with noise suppression (Web Audio API)
3. Return the asset URL for the Director to use

Add to the recording handler:

```typescript
// After recording stops:
const formData = new FormData();
formData.append("file", audioBlob, `recording-${Date.now()}.wav`);
formData.append("projectId", projectId);

const res = await fetch(`/api/projects/${projectId}/audio/record`, {
  method: "POST",
  credentials: "include",
  body: formData,
});

if (res.ok) {
  const data = await res.json();
  // Return to Director for processing
  return data;
}
```

- [ ] **Step 2: Create audio record endpoint**

```typescript
// src/app/api/projects/[id]/audio/record/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { assets } from "@/db/schema";
import { put } from "@vercel/blob";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = file.name.split(".").pop() || "wav";
  const path = `${user.id}/${projectId || "general"}/audio/${crypto.randomUUID()}.${ext}`;

  const blob = await put(path, file, {
    access: "private",
    contentType: file.type || "audio/wav",
  });

  const proxyUrl = `/api/assets/proxy?url=${encodeURIComponent(blob.url)}`;

  const assetId = crypto.randomUUID();
  await db.insert(assets).values({
    id: assetId,
    userId: user.id,
    projectId: projectId || null,
    kind: "audio",
    source: "uploaded",
    name: file.name,
    blobUrl: proxyUrl,
    blobPathname: blob.pathname,
    mimeType: file.type || "audio/wav",
    approved: false,
    createdAt: new Date(),
  });

  return NextResponse.json({
    assetId,
    url: proxyUrl,
    name: file.name,
    mimeType: file.type || "audio/wav",
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/voice-recorder.tsx src/app/api/projects/\[id\]/audio/record/route.ts
git commit -m "feat: voice recording saves to project with auto-cleanup"
```

---

## Task 5: Text-to-Speech API

**Files:**
- Create: `src/lib/tts-client.ts`
- Create: `src/app/api/projects/[id]/audio/tts/route.ts`

**Interfaces:**
- Produces: `generateVoiceover(text, voiceParams)`, `TTSResult`

- [ ] **Step 1: Create TTS client (Chatterbox via Replicate or self-hosted)**

For MVP, use a simple approach — the user's OpenRouter key can access TTS models. Alternatively, use browser Web Speech API for drafts and cloud API for final.

```typescript
// src/lib/tts-client.ts

export interface VoiceParams {
  text: string;
  gender?: "male" | "female" | "neutral";
  age?: string;
  tone?: string;
  pace?: "slow" | "normal" | "fast";
  emotion?: string;
  language?: string;
}

export interface TTSResult {
  audioUrl: string;
  duration: number;
  transcription?: string;
}

// MVP: Use Web Speech API for preview, cloud API for final
// Future: Route to Qwen3-TTS (English) or Chatterbox (multilingual)

export async function generateVoiceover(
  projectId: string,
  params: VoiceParams
): Promise<TTSResult> {
  // For now, use browser TTS as preview
  // In production, this would call a TTS API

  // Placeholder — will be replaced with actual API call
  throw new Error("TTS not yet configured. Use voice recording instead.");
}
```

- [ ] **Step 2: Create TTS endpoint**

```typescript
// src/app/api/projects/[id]/audio/tts/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { text, voice } = body;

  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  // MVP: Return instructions for browser TTS
  // Future: Call Qwen3-TTS or Chatterbox API
  return NextResponse.json({
    message: "TTS generation will be available soon. For now, use the voice recorder.",
    text,
    voice,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/tts-client.ts src/app/api/projects/\[id\]/audio/tts/route.ts
git commit -m "feat: add TTS client stub for voiceover generation"
```

---

## Task 6: Audio Mixing Endpoint

**Files:**
- Create: `src/app/api/projects/[id]/audio/mix/route.ts`
- Create: `src/lib/audio-utils.ts`

**Interfaces:**
- Consumes: Audio track URLs
- Produces: Mixed audio file

- [ ] **Step 1: Create audio utils**

```typescript
// src/lib/audio-utils.ts

// Audio mixing utilities
// MVP: Basic operations using FFmpeg (via @ffmpeg/ffmpeg WASM or server-side)
// Future: Full timeline mixing

export interface MixTrack {
  url: string;
  startTime: number; // seconds
  endTime?: number;
  volume: number; // 0.0 - 1.0
  fadeIn?: number; // ms
  fadeOut?: number; // ms
}

export interface MixOptions {
  tracks: MixTrack[];
  outputFormat?: "wav" | "mp3" | "aac";
  sampleRate?: number;
  normalize?: boolean;
}

// Auto-ducking: reduce music volume when voice is present
export function calculateDucking(
  voiceTrack: MixTrack,
  musicTrack: MixTrack,
  duckAmount: number = -6 // dB
): MixTrack {
  // Simple ducking: reduce music volume during voice segments
  // Future: Use sidechain compression for smooth ducking
  return {
    ...musicTrack,
    volume: musicTrack.volume * Math.pow(10, duckAmount / 20),
  };
}
```

- [ ] **Step 2: Create mix endpoint**

The mix endpoint will be a placeholder for now — actual FFmpeg mixing would be done server-side or via a worker.

```typescript
// src/app/api/projects/[id]/audio/mix/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

async function getSessionUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { tracks, outputFormat } = body;

  if (!tracks?.length) {
    return NextResponse.json({ error: "tracks required" }, { status: 400 });
  }

  // MVP: Return mix plan for frontend Web Audio API mixing
  // Future: Server-side FFmpeg mixing
  return NextResponse.json({
    message: "Audio mixing will be performed client-side using Web Audio API",
    tracks,
    outputFormat: outputFormat || "wav",
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/audio-utils.ts src/app/api/projects/\[id\]/audio/mix/route.ts
git commit -m "feat: add audio mixing utilities and endpoint"
```

---

## Task 7: Director Prompt — Unified with Editor + Sound

**Files:**
- Modify: `src/lib/director-prompt.ts`

**Interfaces:**
- Produces: Complete Director prompt with all skills

- [ ] **Step 1: Final prompt assembly**

The Director prompt should now be assembled from:
1. Core Director prompt (reference analysis, asset management, generation planning)
2. Editor Skill (frame editing, timing, composition)
3. Sound Director (voice, music, SFX, mixing)

The prompt should handle these user intents seamlessly:

**Video editing:**
- "Change the character at 3 seconds" → Editor Skill
- "Make it more intense" → Editor Skill (timing + style)
- "Shorten the buildup" → Editor Skill

**Audio:**
- "Add a narrator" → Sound Director (voiceover)
- "Use my voice" → Sound Director (voice clone)
- "Change the music" → Sound Director (music)
- "Add sound effects" → Sound Director (SFX)
- "The music is too loud" → Sound Director (mixing)

**Combined:**
- "Make it cinematic with a deep voice narrator" → Both skills
- "Edit the video and add background music" → Both skills

- [ ] **Step 2: Commit**

```bash
git add src/lib/director-prompt.ts
git commit -m "feat: unify Director prompt with Editor Skill and Sound Director"
```

---

## Task 8: Chat Workspace — Frame Selection + Audio Controls

**Files:**
- Modify: `src/components/chat-workspace.tsx`
- Create: `src/components/audio-timeline.tsx`

**Interfaces:**
- Consumes: Generation results, audio tracks
- Produces: Frame selection UI, audio timeline

- [ ] **Step 1: Add frame selection to chat workspace**

When a video is displayed in chat, add frame selection:
1. Click on video → show timeline scrubber
2. Click "Select Frame" → extract frame at current time
3. Frame appears in chat as a reference image
4. User can say "edit this frame" → Director knows which frame

```typescript
// Add to chat-workspace.tsx:
const [selectedFrame, setSelectedFrame] = useState<{ time: number; imageUrl: string } | null>(null);

const handleFrameSelect = (time: number, videoEl: HTMLVideoElement) => {
  const canvas = document.createElement("canvas");
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    videoEl.currentTime = time;
    ctx.drawImage(videoEl, 0, 0);
    const imageUrl = canvas.toDataURL("image/png");
    setSelectedFrame({ time, imageUrl });
    // Send to Director as context
  }
};
```

- [ ] **Step 2: Create audio timeline component**

```typescript
// src/components/audio-timeline.tsx
"use client";

interface AudioTrack {
  id: string;
  kind: string;
  name: string;
  startTime: number;
  duration: number;
  volume: number;
}

interface AudioTimelineProps {
  tracks: AudioTrack[];
  totalDuration: number;
  currentTime: number;
}

export function AudioTimeline({ tracks, totalDuration, currentTime }: AudioTimelineProps) {
  const kinds = ["dialogue", "voiceover", "music", "ambience", "foley", "sfx"];
  const kindColors: Record<string, string> = {
    dialogue: "bg-blue-500",
    voiceover: "bg-green-500",
    music: "bg-purple-500",
    ambience: "bg-yellow-500",
    foley: "bg-orange-500",
    sfx: "bg-red-500",
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-neutral-500">Timeline</span>
        <span className="text-[10px] text-neutral-600">
          {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
        </span>
      </div>
      {kinds.map((kind) => {
        const track = tracks.find((t) => t.kind === kind);
        if (!track) return null;
        const left = (track.startTime / totalDuration) * 100;
        const width = (track.duration / totalDuration) * 100;
        return (
          <div key={kind} className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-neutral-500 w-16 truncate">{kind}</span>
            <div className="flex-1 h-4 bg-neutral-800 rounded relative">
              <div
                className={`absolute h-full rounded ${kindColors[kind]} opacity-60`}
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chat-workspace.tsx src/components/audio-timeline.tsx
git commit -m "feat: add frame selection and audio timeline UI"
```

---

## Task 9: Testing Checklist + Push

- [ ] Director correctly detects editing vs generation intent
- [ ] Director asks "what exactly should change?" for targeted edits
- [ ] Frame selection works on generated videos
- [ ] Voice recording saves to project
- [ ] Audio timeline displays tracks
- [ ] Director routes audio requests to Sound Director
- [ ] Director routes video edits to Editor Skill
- [ ] No model names or API details exposed to user
- [ ] Build passes with no errors
- [ ] Push to Vercel for testing

```bash
cd "/Users/shabamedchiheb/Documents/Default Project/numu-growth-studio"
npm run build && git push origin feat/ai-director-mvp
```

---

## What's NOT in this MVP (future plans)

| Feature | Status | Next Step |
|---------|--------|-----------|
| TTS (Qwen3-TTS / Chatterbox) | Stub ready | Need GPU server or cloud API |
| Music generation (ACE-Step) | Not started | Need GPU server |
| Stem separation (Demucs) | Not started | Need GPU server |
| AudioSep (language-queried) | Not started | Need GPU server |
| Sound effects library | Not started | Source CC0 SFX library |
| Color grading | Not started | VACE + LUT integration |
| Full timeline UI | Not started | Build after audio pipeline works |
| DaVinci Resolve integration | Not started | Future MCP integration |
| Voice cloning | Not started | Need Chatterbox/Qwen server |
| Noise suppression (DeepFilterNet) | Not started | Need GPU or browser WASM |

### Recommended MVP Audio Stack (cloud-hosted):
- **TTS:** Chatterbox via Replicate API ($0.0023/sec)
- **Transcription:** WhisperX via Replicate API
- **Music:** Openverse API (existing library) → ACE-Step later
- **SFX:** Freesound API (CC0 library)
- **Mixing:** Browser Web Audio API → FFmpeg server-side later
