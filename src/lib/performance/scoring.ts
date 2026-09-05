export interface PerformanceScore {
  postId: string;
  platform: string;
  objective: string;
  rawMetrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    completionRate?: number;
  };
  normalizedScore: number;
  confidence: "low" | "medium" | "high";
}

export function calculateNormalizedScore(params: {
  metrics: { views: number; likes: number; comments: number; shares: number; saves: number; completionRate?: number };
  accountBaseline?: { avgViews: number; avgLikes: number };
  audienceSize?: number;
  daysSincePublish: number;
  objective: string;
}): { score: number; confidence: "low" | "medium" | "high" } {
  const { metrics, accountBaseline, daysSincePublish, objective } = params;
  
  const engagement = metrics.likes + metrics.shares * 2 + metrics.saves * 3 + metrics.comments * 1.5;
  const reach = metrics.views || 1;
  const engagementRate = engagement / reach;
  
  let timeDecay = Math.max(0.3, 1 - (daysSincePublish / 30));
  let baselineMultiplier = 1;
  if (accountBaseline && accountBaseline.avgViews > 0) {
    baselineMultiplier = Math.min(3, metrics.views / accountBaseline.avgViews);
  }
  
  let score = engagementRate * 100 * timeDecay * baselineMultiplier;
  
  if (objective === "completion" && metrics.completionRate) {
    score = score * 0.5 + metrics.completionRate * 100 * 0.5;
  }
  if (objective === "saves") {
    score = (metrics.saves / (reach || 1)) * 1000 * timeDecay;
  }
  
  score = Math.max(0, Math.min(100, score));
  
  let confidence: "low" | "medium" | "high" = "low";
  if (metrics.views > 10000 && daysSincePublish >= 3) confidence = "high";
  else if (metrics.views > 1000 && daysSincePublish >= 2) confidence = "medium";
  
  return { score: Math.round(score * 10) / 10, confidence };
}

export function rankCreatives(scores: PerformanceScore[]): PerformanceScore[] {
  return [...scores].sort((a, b) => {
    if (a.confidence !== b.confidence) {
      const confOrder = { high: 0, medium: 1, low: 2 };
      return confOrder[a.confidence] - confOrder[b.confidence];
    }
    return b.normalizedScore - a.normalizedScore;
  });
}

export function suggestVariants(params: {
  winner: PerformanceScore;
  features: string[];
  budget: number;
}): string[] {
  const suggestions: string[] = [];
  
  if (params.budget >= 2) {
    suggestions.push(`Keep the ${params.features[0] || "hook"} and change the setting. Test 2 variations.`);
  }
  if (params.budget >= 1) {
    suggestions.push(`Keep the edit rhythm, change the presenter or talent.`);
  }
  
  return suggestions;
}
