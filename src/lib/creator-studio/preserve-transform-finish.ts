import type { RawFootageAnalysis, PreserveTransformFinish, TransformItem, FinishItem } from "@/types/raw-footage";

export function buildPreserveTransformFinish(
  analysis: RawFootageAnalysis,
  userInstructions: string
): PreserveTransformFinish {
  const preserve: string[] = [];
  const transform: TransformItem[] = [];
  const finish: FinishItem[] = [];

  preserve.push("Performance and timing");
  preserve.push("Dialogue and voice");
  preserve.push("Body motion and choreography");
  if (analysis.people.some((p) => p.handsVisible)) {
    preserve.push("Hand-object interactions");
  }
  preserve.push("Camera path and framing");

  const lowerInstructions = userInstructions.toLowerCase();

  if (lowerInstructions.includes("location") || lowerInstructions.includes("place") || lowerInstructions.includes("background")) {
    transform.push({
      target: "location",
      replacement: "user-specified or generated location",
      method: "generative replacement",
      confidence: 0.8,
    });
  }

  if (lowerInstructions.includes("wardrobe") || lowerInstructions.includes("outfit") || lowerInstructions.includes("clothes")) {
    transform.push({
      target: "wardrobe",
      replacement: "user-specified wardrobe",
      method: "generative replacement",
      confidence: 0.75,
    });
  }

  if (lowerInstructions.includes("face") || lowerInstructions.includes("character") || lowerInstructions.includes("identity")) {
    transform.push({
      target: "visible identity",
      replacement: "approved character asset",
      method: "character replacement",
      confidence: 0.7,
    });
  }

  if (lowerInstructions.includes("lighting") || lowerInstructions.includes("mood")) {
    transform.push({
      target: "lighting environment",
      replacement: "relit to match new environment",
      method: "generative relighting",
      confidence: 0.7,
    });
  }

  finish.push({ action: "Trim and pace", description: "Remove weak pauses, tighten opening", priority: "high" });
  finish.push({ action: "Dialogue cleanup", description: "Clean room noise, normalize levels", priority: "high" });
  finish.push({ action: "Color grade", description: "Match look to new environment", priority: "medium" });
  finish.push({ action: "Sound design", description: "Add ambience, music, Foley", priority: "medium" });
  finish.push({ action: "Master", description: "Final mix and export", priority: "low" });

  return { preserve, transform, finish };
}

export function formatPreserveTransformFinish(ptf: PreserveTransformFinish): string {
  const lines: string[] = [];
  lines.push("PRESERVE");
  for (const item of ptf.preserve) lines.push(`- ${item}`);
  lines.push("");
  lines.push("TRANSFORM");
  for (const item of ptf.transform) lines.push(`- ${item.target} → ${item.replacement} (${item.method}, confidence: ${item.confidence})`);
  lines.push("");
  lines.push("FINISH");
  for (const item of ptf.finish) lines.push(`- [${item.priority}] ${item.action}: ${item.description}`);
  return lines.join("\n");
}
