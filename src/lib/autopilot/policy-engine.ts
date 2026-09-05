export interface AutopilotPolicy {
  id: string;
  brandId: string;
  objective: string;
  status: "paused" | "running" | "error" | "completed";
  channels: string[];
  outputTypes: string[];
  approvalLevel: "concept" | "generation" | "publishing" | "full";
  budget: BudgetPolicy;
  brandRules: string[];
  experimentationPct: number;
  stopConditions: StopCondition[];
}

export interface BudgetPolicy {
  monthlyCredits: number;
  weeklyCredits: number;
  perAssetMax: number;
  reservePct: number;
}

export interface StopCondition {
  type: "budget_exhausted" | "repeated_failures" | "auth_loss" | "safety_flag" | "poor_performance" | "uncertainty";
  threshold: number;
}

export interface BudgetAllocation {
  totalBudget: number;
  reserved: number;
  allocated: number;
  available: number;
  breakdown: { category: string; allocated: number; spent: number }[];
}

export function calculateAllocation(policy: AutopilotPolicy, spent: number): BudgetAllocation {
  const reserve = policy.budget.monthlyCredits * (policy.budget.reservePct / 100);
  const available = policy.budget.monthlyCredits - reserve - spent;

  const experimentBudget = available * (policy.experimentationPct / 100);
  const safeBudget = available - experimentBudget;

  return {
    totalBudget: policy.budget.monthlyCredits,
    reserved: reserve,
    allocated: available,
    available: Math.max(0, available),
    breakdown: [
      { category: "safe_productions", allocated: safeBudget, spent: 0 },
      { category: "experiments", allocated: experimentBudget, spent: 0 },
      { category: "reserve", allocated: reserve, spent: 0 },
    ],
  };
}

export function shouldStop(policy: AutopilotPolicy, context: {
  totalSpent: number;
  consecutiveFailures: number;
  authValid: boolean;
  lastPerformanceScore: number;
}): { stop: boolean; reason?: string } {
  for (const condition of policy.stopConditions) {
    switch (condition.type) {
      case "budget_exhausted":
        if (context.totalSpent >= policy.budget.monthlyCredits * 0.95) {
          return { stop: true, reason: "Budget 95% exhausted" };
        }
        break;
      case "repeated_failures":
        if (context.consecutiveFailures >= condition.threshold) {
          return { stop: true, reason: `${context.consecutiveFailures} consecutive failures` };
        }
        break;
      case "auth_loss":
        if (!context.authValid) {
          return { stop: true, reason: "Platform authentication expired" };
        }
        break;
      case "poor_performance":
        if (context.lastPerformanceScore > 0 && context.lastPerformanceScore < condition.threshold) {
          return { stop: true, reason: `Performance score ${context.lastPerformanceScore} below threshold ${condition.threshold}` };
        }
        break;
    }
  }
  return { stop: false };
}
