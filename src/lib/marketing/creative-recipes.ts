export interface CreativeRecipe {
  id: string;
  name: string;
  description: string;
  objective: string;
  recommendedDuration: string;
  aspectRatio: string;
  shotGrammar: string[];
  productPlacement: string;
  hookStructure: string;
  editingRhythm: string;
  copyPattern: string;
  audioPattern: string;
  qcCriteria: string[];
}

export const CREATIVE_RECIPES: CreativeRecipe[] = [
  {
    id: "product-hero",
    name: "Product Hero",
    description: "Single hero product shot with dramatic lighting",
    objective: "Brand awareness, product launch",
    recommendedDuration: "6-10s",
    aspectRatio: "1:1 or 9:16",
    shotGrammar: ["Wide establishing → medium → product close-up", "Static or slow dolly"],
    productPlacement: "Center frame, 60%+ of frame",
    hookStructure: "Immediate product reveal or tease-then-reveal",
    editingRhythm: "Slow, deliberate cuts. 2-3 shots max.",
    copyPattern: "Brand name + product name + one benefit",
    audioPattern: "Minimal music, subtle ambient. Product sound effects.",
    qcCriteria: ["Product geometry accurate", "Logo readable", "Material/finish correct"],
  },
  {
    id: "ugc-problem-solution",
    name: "UGC Problem → Solution",
    description: "Creator shows problem, then reveals product as solution",
    objective: "Conversion, product education",
    recommendedDuration: "15-30s",
    aspectRatio: "9:16",
    shotGrammar: ["Hook (problem) → transition → reveal → proof → CTA"],
    productPlacement: "Reveal at 30-40% mark, hero at 60-70%",
    hookStructure: "Pain point statement or visual. 'I used to struggle with...'",
    editingRhythm: "Fast hook (2s), slower middle, fast close. 4-6 cuts.",
    copyPattern: "Problem statement → solution reveal → proof → CTA",
    audioPattern: "Voiceover throughout, light background music",
    qcCriteria: ["Lip sync accurate", "Creator identity preserved", "Product visible and clear"],
  },
  {
    id: "luxury-macro-reveal",
    name: "Luxury Macro Reveal",
    description: "Close-up macro shots revealing product details",
    objective: "Premium positioning, luxury brands",
    recommendedDuration: "10-15s",
    aspectRatio: "16:9 or 1:1",
    shotGrammar: ["Abstract texture → pull back → full product → environment"],
    productPlacement: "Reveal gradually, build anticipation",
    hookStructure: "Mysterious close-up. No context. Let curiosity build.",
    editingRhythm: "Very slow. 1-2s per shot. Long holds.",
    copyPattern: "Minimal. Brand name only at end.",
    audioPattern: "Cinematic score. No voiceover. Sound design for reveals.",
    qcCriteria: ["Material quality visible", "No distortion", "Lighting flatters product"],
  },
  {
    id: "founder-story",
    name: "Founder Story",
    description: "Founder speaks directly to camera about their mission",
    objective: "Brand trust, storytelling",
    recommendedDuration: "30-60s",
    aspectRatio: "9:16 or 16:9",
    shotGrammar: ["Talking head → B-roll → talking head → product → CTA"],
    productPlacement: "Show product naturally in B-roll, hero at end",
    hookStructure: "Bold opening statement or surprising fact",
    editingRhythm: "Conversational pace. Cuts every 3-5s during speech.",
    copyPattern: "Natural speech. Story arc: why → what → how → result",
    audioPattern: "Clear voiceover, minimal music, ambient room tone",
    qcCriteria: ["Speech clear and intelligible", "Lip sync accurate", "Authentic feel"],
  },
  {
    id: "motion-graphic-ad",
    name: "Motion Graphic Ad",
    description: "Animated graphics with text overlays for social",
    objective: "Social ads, retargeting, announcements",
    recommendedDuration: "6-15s",
    aspectRatio: "9:16",
    shotGrammar: ["Text hook → animated benefit → product → CTA"],
    productPlacement: "Product image overlaid on motion graphics",
    hookStructure: "Bold text on screen. Question or stat.",
    editingRhythm: "Fast, rhythmic. Synced to music beat.",
    copyPattern: "Short punchy text. 3-5 words per screen.",
    audioPattern: "Upbeat music, sound effects on transitions",
    qcCriteria: ["Text readable", "Timing synced", "Product visible"],
  },
  {
    id: "cinematic-tv-spot",
    name: "Cinematic TV Spot",
    description: "Full production commercial with narrative arc",
    objective: "Brand campaigns, TV/digital advertising",
    recommendedDuration: "15-60s",
    aspectRatio: "16:9",
    shotGrammar: ["Hook → world build → story → product integration → hero → CTA"],
    productPlacement: "Integrated naturally, hero shot at 70% mark",
    hookStructure: "Emotional or visual hook. Something unexpected.",
    editingRhythm: "Varied. Fast for energy, slow for emotion. 8-15 shots.",
    copyPattern: "Narrative with brand voice. Emotional arc.",
    audioPattern: "Full score, voiceover, sound design, Foley",
    qcCriteria: ["Story coherent", "Brand consistent", "Production quality high"],
  },
];

export function getRecipeById(id: string): CreativeRecipe | undefined {
  return CREATIVE_RECIPES.find((r) => r.id === id);
}

export function suggestRecipe(params: {
  objective: string;
  duration?: number;
  platform?: string;
}): CreativeRecipe {
  const { objective, duration, platform } = params;
  const lower = objective.toLowerCase();
  
  if (lower.includes("product") && lower.includes("hero")) return getRecipeById("product-hero")!;
  if (lower.includes("ugc") || lower.includes("problem")) return getRecipeById("ugc-problem-solution")!;
  if (lower.includes("luxury") || lower.includes("premium")) return getRecipeById("luxury-macro-reveal")!;
  if (lower.includes("founder") || lower.includes("story")) return getRecipeById("founder-story")!;
  if (lower.includes("motion") || lower.includes("graphic")) return getRecipeById("motion-graphic-ad")!;
  if (lower.includes("tv") || lower.includes("cinematic") || lower.includes("commercial")) return getRecipeById("cinematic-tv-spot")!;
  
  if (platform === "tiktok" || platform === "instagram") return getRecipeById("ugc-problem-solution")!;
  if (duration && duration <= 10) return getRecipeById("product-hero")!;
  
  return getRecipeById("cinematic-tv-spot")!;
}

export function formatRecipeForPrompt(recipe: CreativeRecipe): string {
  return `[CREATIVE RECIPE: ${recipe.name}]
Objective: ${recipe.objective}
Duration: ${recipe.recommendedDuration}
Shot grammar: ${recipe.shotGrammar.join("; ")}
Product placement: ${recipe.productPlacement}
Hook: ${recipe.hookStructure}
Editing: ${recipe.editingRhythm}
Copy: ${recipe.copyPattern}
Audio: ${recipe.audioPattern}`;
}
