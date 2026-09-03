export type OutputType = "image" | "video";

export type ReferenceNode = {
  id: string;
  kind: "video" | "image" | "url";
  name: string;
  blobUrl?: string;
  trimmedFrom?: number;
  trimmedTo?: number;
  durationSec?: number;
};

export type EntityNode = {
  id: string;
  kind: "character" | "product" | "location" | "prop" | "style" | "audio";
  name: string;
  description: string;
  masterAssetIds: string[];
  approvedAssetIds: string[];
  consistencyRules: string[];
  status: "missing" | "draft" | "approved";
};

export type ShotNode = {
  id: string;
  startSec: number;
  endSec: number;
  description: string;
  shotScale?: string;
  camera?: string;
  motion?: string;
  subjects: string[];
  products: string[];
  location?: string;
  preserve: string[];
  change: string[];
};

export type SceneNode = {
  id: string;
  order: number;
  title: string;
  purpose: string;
  targetDurationSec: number;
  sourceReferenceId?: string;
  shots: ShotNode[];
  preserve: string[];
  change: string[];
  status: "planned" | "assets_needed" | "ready" | "rendering" | "review" | "approved";
};

export type ProductionGraph = {
  version: number;
  goal: {
    outputType: OutputType;
    purpose?: string;
    targetDurationSec?: number;
    aspectRatio?: string;
    budgetCredits?: number;
  };
  creativeBrief: {
    userIntent: string;
    styleSummary?: string;
    audience?: string;
    mustHave?: string[];
    mustAvoid?: string[];
  };
  references: ReferenceNode[];
  characters: EntityNode[];
  products: EntityNode[];
  locations: EntityNode[];
  audioAssets: EntityNode[];
  scenes: SceneNode[];
  locks: {
    globalPreserve: string[];
    globalChange: string[];
  };
};

export function createEmptyGraph(userIntent: string = ""): ProductionGraph {
  return {
    version: 1,
    goal: {
      outputType: "video",
    },
    creativeBrief: {
      userIntent,
    },
    references: [],
    characters: [],
    products: [],
    locations: [],
    audioAssets: [],
    scenes: [],
    locks: {
      globalPreserve: [],
      globalChange: [],
    },
  };
}
