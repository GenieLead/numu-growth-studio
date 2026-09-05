export interface CreativeFeatures {
  hookType: string;
  firstProductAppearanceTime: number;
  faceNoFace: boolean;
  creatorArchetype: string;
  ugcCinematic: string;
  shotDensity: number;
  averageShotLength: number;
  musicEnergy: string;
  voiceoverNoVoiceover: boolean;
  ctaType: string;
  visualWorld: string;
  productMacroFrequency: string;
  duration: number;
  aspectRatio: string;
}

export function extractCreativeFeatures(params: {
  duration: number;
  aspectRatio: string;
  hasVoiceover: boolean;
  hasFace: boolean;
  shotCount: number;
  productAppearances: number;
  musicMood?: string;
}): CreativeFeatures {
  return {
    hookType: params.hasFace ? "face-hook" : "product-hook",
    firstProductAppearanceTime: params.productAppearances > 0 ? 2 : -1,
    faceNoFace: params.hasFace,
    creatorArchetype: params.hasFace ? "on-camera" : "voiceover",
    ugcCinematic: params.shotCount > 5 ? "cinematic" : "ugc",
    shotDensity: params.shotCount / (params.duration || 1),
    averageShotLength: params.duration / (params.shotCount || 1),
    musicEnergy: params.musicMood || "neutral",
    voiceoverNoVoiceover: params.hasVoiceover,
    ctaType: "end-card",
    visualWorld: "to-determine",
    productMacroFrequency: params.productAppearances > 2 ? "frequent" : "single",
    duration: params.duration,
    aspectRatio: params.aspectRatio,
  };
}

export function formatFeaturesForAnalysis(features: CreativeFeatures): string {
  return [
    `Hook: ${features.hookType}`,
    `Creator: ${features.creatorArchetype}, ${features.ugcCinematic}`,
    `Pacing: ${features.averageShotLength.toFixed(1)}s avg shot, ${features.shotDensity.toFixed(1)} shots/s`,
    `Product: ${features.productMacroFrequency} appearances`,
    `Audio: ${features.voiceoverNoVoiceover ? "voiceover" : "no VO"}, ${features.musicEnergy} music`,
  ].join(", ");
}
