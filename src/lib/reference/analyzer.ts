import type { ReferenceAnalysis } from "@/types/reference-analysis";

export function parseAnalysisFromResponse(response: string): ReferenceAnalysis | null {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]) as ReferenceAnalysis;
    const objMatch = response.match(/\{[\s\S]*"durationSec"[\s\S]*\}/);
    if (objMatch) {
      let braceCount = 0;
      let endIdx = 0;
      for (let i = 0; i < objMatch[0].length; i++) {
        if (objMatch[0][i] === "{") braceCount++;
        if (objMatch[0][i] === "}") braceCount--;
        if (braceCount === 0) { endIdx = i + 1; break; }
      }
      return JSON.parse(objMatch[0].substring(0, endIdx)) as ReferenceAnalysis;
    }
  } catch { return null; }
  return null;
}

export function buildAnalysisPrompt(): string {
  return `Analyze this reference video in detail. Return a JSON object with this exact structure:
{
  "durationSec": number,
  "cuts": [array of cut timestamps in seconds],
  "shots": [{"index": number, "startSec": number, "endSec": number, "cameraMovement": "static|pan|tilt|dolly|tracking|handheld|zoom", "framing": "wide|medium|close-up|extreme-close-up|overhead|low-angle|eye-level", "subjects": ["description"], "lighting": "natural|studio|dramatic|soft|hard|mixed"}],
  "recurringEntities": [{"id": "unique-id", "type": "person|product|object|location", "description": "visual description", "appearanceWindows": [{"start": number, "end": number}]}],
  "editingDNA": {"pacing": "description", "transitions": "description", "cameraLanguage": "style", "lightingLanguage": "style", "soundLanguage": "inferred audio style"}
}
Be precise with timestamps. Count every cut. Identify every recurring person, product, and location.`;
}

export function buildPreserveChangePrompt(analysis: ReferenceAnalysis, userInstructions: string): string {
  return `Based on this reference analysis and user instructions, create a preserve/change/reinterpret map.
REFERENCE ANALYSIS:
Duration: ${analysis.durationSec}s
Cuts: ${analysis.cuts.length} cuts at ${analysis.cuts.join(", ")}s
Editing DNA: ${analysis.editingDNA.pacing} pacing, ${analysis.editingDNA.transitions} transitions
Entities: ${analysis.recurringEntities.map((e) => `${e.type}: ${e.description}`).join("; ")}
USER INSTRUCTIONS: ${userInstructions}
Return a JSON object:
{
  "preserve": ["list of elements to keep unchanged"],
  "change": [{"target": "what to replace", "replacement": "what to replace it with", "entityType": "person|product|location|object", "confidence": 0.0-1.0}],
  "reinterpret": ["elements to reinterpret (mood, grade, music)"]
}
Be specific. Every change must reference a concrete entity or element.`;
}
