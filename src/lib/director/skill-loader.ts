export interface Skill {
  id: string;
  name: string;
  description: string;
  triggerIntents: string[];
  systemPrompt: string;
  version: string;
}

const SKILLS: Skill[] = [
  {
    id: "reference-transform",
    name: "Reference Transform",
    description: "Transform a reference video while preserving structure",
    triggerIntents: ["reference_to_video", "reference_transform", "keep.*change", "replace.*keep"],
    systemPrompt: `You are executing a REFERENCE TRANSFORM. Analyze the reference deeply:
1. Shot structure and timing
2. Camera movement and framing
3. Entity appearances (people, products, locations)
4. Editing DNA (pacing, transitions, rhythm)
5. What to PRESERVE vs CHANGE vs REINTERPRET
Build a preserve/change map before proposing generation.`,
    version: "1.0.0",
  },
  {
    id: "ugc-transform",
    name: "UGC Transform",
    description: "Transform raw phone footage into premium content",
    triggerIntents: ["ugc_transform", "raw footage", "phone footage", "make this look premium"],
    systemPrompt: `You are executing a UGC TRANSFORM. Analyze the raw footage:
1. Story and performance quality
2. What to PRESERVE (identity, voice, motion, story)
3. What to TRANSFORM (location, wardrobe, lighting, production design)
4. What to FINISH (edit, color, sound, music)
Prefer hybrid editing over full regeneration when it preserves authenticity.`,
    version: "1.0.0",
  },
  {
    id: "product-photography",
    name: "Product Photography",
    description: "Create product images and shots",
    triggerIntents: ["product_image", "product shot", "product photo", "packshot"],
    systemPrompt: `You are executing PRODUCT PHOTOGRAPHY. Focus on:
1. Product geometry and proportions
2. Lighting that flatters the product
3. Background and environment
4. Camera angle and framing
5. Material and finish accuracy
Always show the product clearly. Never distort logos or labels.`,
    version: "1.0.0",
  },
  {
    id: "commercial-director",
    name: "Commercial Director",
    description: "Direct commercial and advertising content",
    triggerIntents: ["commercial", "ad", "advertisement", "brand film", "hero video"],
    systemPrompt: `You are directing a COMMERCIAL. Focus on:
1. Hook in first 2 seconds
2. Product reveal timing
3. Brand identity preservation
4. Emotional arc (attention -> desire -> action)
5. Duration and pacing for the platform
6. Call-to-action placement`,
    version: "1.0.0",
  },
  {
    id: "sound-director",
    name: "Sound Director",
    description: "Handle audio, voice, music, and sound design",
    triggerIntents: ["audio", "music", "voiceover", "sound", "voice"],
    systemPrompt: `You are the SOUND DIRECTOR. Handle:
1. Voiceover creation and placement
2. Music selection/generation
3. Ambience and Foley
4. Sound levels and mixing
5. Ducking under dialogue
6. Final audio master
Audio is half the illusion. Premium picture with generic sound feels cheap.`,
    version: "1.0.0",
  },
];

export function loadSkills(intent: string, userMessage: string): Skill[] {
  const lowerMessage = userMessage.toLowerCase();
  return SKILLS.filter((skill) =>
    skill.triggerIntents.some(
      (trigger) => lowerMessage.includes(trigger.toLowerCase()) || intent.includes(trigger)
    )
  );
}

export function getSkillPrompts(skills: Skill[]): string {
  if (skills.length === 0) return "";
  return `\n\n--- ACTIVE SKILLS ---\n${skills.map((s) => `[${s.name}]\n${s.systemPrompt}`).join("\n\n")}`;
}

export function getAllSkills(): Skill[] {
  return [...SKILLS];
}
