import type { AutopilotPolicy } from "./policy-engine";

export interface ScheduledJob {
  id: string;
  policyId: string;
  scheduledAt: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  type: "generate" | "publish" | "analyze" | "variant";
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export function buildWeeklySchedule(policy: AutopilotPolicy): ScheduledJob[] {
  const jobs: ScheduledJob[] = [];
  const now = new Date();

  for (let day = 0; day < 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);

    jobs.push({
      id: "",
      policyId: policy.id,
      scheduledAt: date.toISOString(),
      status: "pending",
      type: "generate",
      payload: { day, objective: policy.objective },
    });

    if (policy.approvalLevel === "full") {
      jobs.push({
        id: "",
        policyId: policy.id,
        scheduledAt: new Date(date.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        type: "publish",
        payload: { day },
      });
    }
  }

  return jobs;
}

export function getNextJobTime(schedule: ScheduledJob[]): string | null {
  const pending = schedule.filter((j) => j.status === "pending").sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  return pending[0]?.scheduledAt || null;
}
