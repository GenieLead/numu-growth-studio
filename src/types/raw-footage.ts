export interface RawFootageAnalysis {
  story: StoryAnalysis;
  people: PersonAnalysis[];
  objects: ObjectAnalysis[];
  world: WorldAnalysis;
  camera: CameraAnalysis;
  audio: AudioAnalysis;
  editingOpportunities: EditingOpportunity[];
}

export interface StoryAnalysis {
  what: string;
  beginning: string;
  change: string;
  payoff: string;
  spokenMeaning: string;
  emotionalBeats: string[];
  hookOpportunities: string[];
}

export interface PersonAnalysis {
  id: string;
  faceVisible: boolean;
  expression: string;
  gaze: string;
  bodyPose: string;
  motion: string;
  handsVisible: boolean;
  speaking: boolean;
  appearanceWindows: { start: number; end: number }[];
}

export interface ObjectAnalysis {
  id: string;
  type: string;
  description: string;
  locationInFrame: string;
  handContact: boolean;
  motion: string;
  appearanceWindows: { start: number; end: number }[];
}

export interface WorldAnalysis {
  roomType: string;
  surfaces: string;
  lightingDirection: string;
  shadows: string;
  depth: string;
  distractions: string[];
  removableElements: string[];
}

export interface CameraAnalysis {
  framing: string;
  cameraMotion: string;
  phoneShake: boolean;
  perspective: string;
  exposure: string;
  issues: string[];
}

export interface AudioAnalysis {
  dialogue: string;
  voiceQuality: string;
  roomNoise: string;
  ambience: string;
  music: boolean;
  transientSounds: string[];
  lipSyncTiming: string;
}

export interface EditingOpportunity {
  type: "weak_pause" | "strong_moment" | "hook_candidate" | "trim_point" | "insert_opportunity" | "reaction_moment" | "b_roll_opportunity" | "pacing_problem";
  timeRange: { start: number; end: number };
  description: string;
  priority: "high" | "medium" | "low";
}

export interface PreserveTransformFinish {
  preserve: string[];
  transform: TransformItem[];
  finish: FinishItem[];
}

export interface TransformItem {
  target: string;
  replacement: string;
  method: string;
  confidence: number;
}

export interface FinishItem {
  action: string;
  description: string;
  priority: "high" | "medium" | "low";
}
