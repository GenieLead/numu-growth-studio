export interface CostEstimate {
  credits: number;
  approvedMaxSuggested: number;
  components: CostComponent[];
  pricingSnapshotId: string;
  expiresAt: string;
}

export interface CostComponent {
  label: string;
  credits: number;
}

export function estimateCost(params: {
  taskType: string;
  duration: number;
  resolution: string;
  passes: number;
  hasReference: boolean;
  hasAudio: boolean;
  needsRepair: boolean;
}): CostEstimate {
  let baseCost = 0;
  const components: CostComponent[] = [];

  switch (params.taskType) {
    case "text_to_video":
      baseCost = 0.1 * params.duration;
      components.push({ label: "Video generation", credits: baseCost });
      break;
    case "reference_to_video":
      baseCost = 0.15 * params.duration;
      components.push({ label: "Reference analysis", credits: 0.05 });
      components.push({ label: "Reference edit", credits: baseCost });
      break;
    case "image_generation":
      baseCost = 0.05;
      components.push({ label: "Image generation", credits: baseCost });
      break;
    case "voiceover":
      baseCost = 0.02;
      components.push({ label: "Voice generation", credits: baseCost });
      break;
    case "music":
      baseCost = 0.03 * params.duration;
      components.push({ label: "Music generation", credits: baseCost });
      break;
    default:
      baseCost = 0.1;
      components.push({ label: "Processing", credits: baseCost });
  }

  if (params.resolution === "1080p") baseCost *= 1.5;
  if (params.resolution === "4k") baseCost *= 3;
  if (params.passes > 1) {
    const multiPassCost = baseCost * (params.passes - 1) * 0.6;
    components.push({ label: `Multi-pass (${params.passes}x)`, credits: multiPassCost });
    baseCost += multiPassCost;
  }
  if (params.hasAudio) {
    const audioCost = 0.02;
    components.push({ label: "Audio processing", credits: audioCost });
    baseCost += audioCost;
  }
  if (params.needsRepair) {
    const repairCost = 0.15;
    components.push({ label: "Repair reserve", credits: repairCost });
    baseCost += repairCost;
  }

  const approvedMax = baseCost * 1.3;

  return {
    credits: Math.round(baseCost * 100) / 100,
    approvedMaxSuggested: Math.round(approvedMax * 100) / 100,
    components,
    pricingSnapshotId: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };
}

export function formatCostEstimate(estimate: CostEstimate): string {
  const lines: string[] = [];
  lines.push("Ready to produce");
  lines.push("");
  for (const comp of estimate.components) {
    lines.push(`  ${comp.label}: ${comp.credits.toFixed(2)} credits`);
  }
  lines.push("");
  lines.push(`Estimated: ${estimate.credits.toFixed(2)} credits`);
  lines.push(`Maximum approved: ${estimate.approvedMaxSuggested.toFixed(2)} credits`);
  return lines.join("\n");
}
