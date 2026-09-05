import type { ReferenceAnalysis, PreserveChangeMap } from "@/types/reference-analysis";

export function compileReferenceTransformPrompt(params: {
  analysis: ReferenceAnalysis;
  preserveChangeMap: PreserveChangeMap;
  assetUrls: Record<string, string | null>;
  duration: number;
  aspectRatio: string;
}): string {
  const { analysis, preserveChangeMap, assetUrls, duration, aspectRatio } = params;
  const lines: string[] = [];
  lines.push("REFERENCE MANIFEST");
  lines.push(`Source video: ${analysis.durationSec}s, ${analysis.cuts.length} cuts`);
  lines.push("");
  lines.push("SOURCE MASTER LOCK");
  lines.push("Source video controls shot order, timing, camera trajectory, framing, choreography and all non-target motion.");
  lines.push("");
  lines.push("TEMPORAL MAP");
  lines.push(`Cuts: ${analysis.cuts.join(", ")}`);
  for (const entity of analysis.recurringEntities) {
    const windows = entity.appearanceWindows.map((w) => `${w.start}-${w.end}s`).join(", ");
    lines.push(`${entity.type} (${entity.description}): appears at ${windows}`);
  }
  lines.push("");
  if (preserveChangeMap.preserve.length > 0) {
    lines.push("PRESERVE");
    for (const item of preserveChangeMap.preserve) lines.push(`- ${item}`);
    lines.push("");
  }
  if (preserveChangeMap.change.length > 0) {
    lines.push("CHANGE ONLY");
    for (let i = 0; i < preserveChangeMap.change.length; i++) {
      const change = preserveChangeMap.change[i];
      lines.push(`${i + 1}. ${change.entityType.toUpperCase()}: Replace "${change.target}" with "${change.replacement}"`);
      if (change.entityType === "person" && assetUrls.character) lines.push(`   Reference image: ${assetUrls.character}`);
      if (change.entityType === "product" && assetUrls.product) lines.push(`   Reference image: ${assetUrls.product}`);
      if (change.entityType === "location" && assetUrls.location) lines.push(`   Reference image: ${assetUrls.location}`);
    }
    lines.push("");
  }
  if (preserveChangeMap.reinterpret.length > 0) {
    lines.push("REINTERPRET");
    for (const item of preserveChangeMap.reinterpret) lines.push(`- ${item}`);
    lines.push("");
  }
  lines.push("OUTPUT CONSTRAINTS");
  lines.push(`Duration: ${duration}s`);
  lines.push(`Aspect ratio: ${aspectRatio}`);
  lines.push("Preserve source editing rhythm and camera language unless explicitly instructed to change.");
  return lines.join("\n");
}
