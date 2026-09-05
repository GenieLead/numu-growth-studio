export interface ProviderHealth {
  provider: string;
  status: "healthy" | "degraded" | "down";
  lastCheck: string;
  successRate: number;
  avgLatencyMs: number;
  circuitOpen: boolean;
  failureCount: number;
}

const healthCache: Map<string, ProviderHealth> = new Map();

export function recordSuccess(provider: string, latencyMs: number): void {
  const existing = healthCache.get(provider) || createDefault(provider);
  existing.failureCount = 0;
  existing.circuitOpen = false;
  existing.avgLatencyMs = (existing.avgLatencyMs + latencyMs) / 2;
  existing.successRate = Math.min(1, existing.successRate + 0.05);
  existing.lastCheck = new Date().toISOString();
  existing.status = existing.successRate > 0.9 ? "healthy" : "degraded";
  healthCache.set(provider, existing);
}

export function recordFailure(provider: string): void {
  const existing = healthCache.get(provider) || createDefault(provider);
  existing.failureCount++;
  existing.successRate = Math.max(0, existing.successRate - 0.1);
  existing.lastCheck = new Date().toISOString();
  if (existing.failureCount >= 5) {
    existing.circuitOpen = true;
    existing.status = "down";
  } else if (existing.failureCount >= 3) {
    existing.status = "degraded";
  }
  healthCache.set(provider, existing);
}

export function isHealthy(provider: string): boolean {
  const health = healthCache.get(provider);
  if (!health) return true;
  return !health.circuitOpen;
}

export function getHealth(provider: string): ProviderHealth {
  return healthCache.get(provider) || createDefault(provider);
}

function createDefault(provider: string): ProviderHealth {
  return { provider, status: "healthy", lastCheck: new Date().toISOString(), successRate: 1, avgLatencyMs: 0, circuitOpen: false, failureCount: 0 };
}
