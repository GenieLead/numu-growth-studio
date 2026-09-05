import type { RawFootageAnalysis } from "@/types/raw-footage";

export function buildRawFootageAnalysisPrompt(): string {
  return `Analyze this raw phone footage in detail for a production context. Return a JSON object:
{
  "story": {"what": "what is happening", "beginning": "opening", "change": "turning point", "payoff": "ending", "spokenMeaning": "what is being said", "emotionalBeats": ["beat1", "beat2"], "hookOpportunities": ["hook1"]},
  "people": [{"id": "p1", "faceVisible": true, "expression": "description", "gaze": "direction", "bodyPose": "pose", "motion": "movement", "handsVisible": true, "speaking": false, "appearanceWindows": [{"start": 0, "end": 10}]}],
  "objects": [{"id": "o1", "type": "product|prop|furniture", "description": "what it is", "locationInFrame": "position", "handContact": false, "motion": "static|moving", "appearanceWindows": [{"start": 0, "end": 10}]}],
  "world": {"roomType": "bedroom|kitchen|office|outdoor", "surfaces": "wall/floor description", "lightingDirection": "direction", "shadows": "quality", "depth": "shallow|deep", "distractions": ["item to remove"], "removableElements": ["element"]},
  "camera": {"framing": "wide|medium|close", "cameraMotion": "static|handheld|moving", "phoneShake": false, "perspective": "eye-level|low|high", "exposure": "good|over|under", "issues": ["any issues"]},
  "audio": {"dialogue": "transcript or description", "voiceQuality": "clear|muffled|noisy", "roomNoise": "quiet|moderate|loud", "ambience": "description", "music": false, "transientSounds": ["sounds"], "lipSyncTiming": "description"},
  "editingOpportunities": [{"type": "hook_candidate|trim_point|weak_pause|strong_moment|insert_opportunity|b_roll_opportunity|pacing_problem", "timeRange": {"start": 0, "end": 5}, "description": "what to do", "priority": "high|medium|low"}]
}
Be thorough. Analyze every second of the footage.`;
}

export function parseRawFootageAnalysis(response: string): RawFootageAnalysis | null {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]) as RawFootageAnalysis;
    const objMatch = response.match(/\{[\s\S]*"story"[\s\S]*\}/);
    if (objMatch) {
      let braceCount = 0;
      let endIdx = 0;
      for (let i = 0; i < objMatch[0].length; i++) {
        if (objMatch[0][i] === "{") braceCount++;
        if (objMatch[0][i] === "}") braceCount--;
        if (braceCount === 0) { endIdx = i + 1; break; }
      }
      return JSON.parse(objMatch[0].substring(0, endIdx)) as RawFootageAnalysis;
    }
  } catch { return null; }
  return null;
}

export function formatAnalysisForBeginner(analysis: RawFootageAnalysis): string {
  const parts: string[] = [];
  parts.push(`The performance is ${analysis.people[0]?.speaking ? "good — they're speaking clearly" : "strong"}.`);
  if (analysis.world.distractions.length > 0) {
    parts.push(`The ${analysis.world.roomType} and sound are holding it back.`);
  }
  if (analysis.editingOpportunities.some((e) => e.type === "weak_pause")) {
    parts.push("I'd tighten the opening.");
  }
  parts.push("I'd keep you, rebuild the location and remaster the audio.");
  return parts.join(" ");
}

export function formatAnalysisForExpert(analysis: RawFootageAnalysis): string {
  const parts: string[] = [];
  const takes = analysis.people[0]?.appearanceWindows || [];
  parts.push(`Performance and blocking are usable. ${takes.length} effective takes detected.`);
  if (analysis.camera.phoneShake) {
    parts.push("Stabilize the micro-jitter.");
  }
  const trimPoints = analysis.editingOpportunities.filter((e) => e.type === "trim_point");
  if (trimPoints.length > 0) {
    parts.push(`Tighten ${trimPoints.map((t) => `${t.timeRange.start}-${t.timeRange.end}s`).join(", ")}.`);
  }
  parts.push("Replace production design, relight to the new environment, rebuild the sound bed.");
  return parts.join(" ");
}
