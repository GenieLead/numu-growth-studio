export interface ReferenceAnalysis {
  durationSec: number;
  cuts: number[];
  shots: ShotAnalysis[];
  recurringEntities: RecurringEntity[];
  editingDNA: EditingDNA;
}

export interface ShotAnalysis {
  index: number;
  startSec: number;
  endSec: number;
  cameraMovement: string;
  framing: string;
  subjects: string[];
  lighting: string;
}

export interface RecurringEntity {
  id: string;
  type: "person" | "product" | "object" | "location";
  description: string;
  appearanceWindows: TimeRange[];
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface EditingDNA {
  pacing: string;
  transitions: string;
  cameraLanguage: string;
  lightingLanguage: string;
  soundLanguage?: string;
}

export interface PreserveChangeMap {
  preserve: string[];
  change: PreserveChangeItem[];
  reinterpret: string[];
}

export interface PreserveChangeItem {
  target: string;
  replacement: string;
  entityType: string;
  confidence: number;
}

export interface RenderPlan {
  taskType: string;
  prompt: string;
  referenceUrls: string[];
  assetUrls: Record<string, string | null>;
  settings: {
    duration: number;
    resolution: string;
    aspectRatio: string;
  };
  estimatedCredits: number;
  preserveChangeMap: PreserveChangeMap;
}
