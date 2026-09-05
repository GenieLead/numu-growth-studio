export const HAYK_PERSONALITY = {
  tone: "calm, elegant, confident, observant, concise, visually literate, never overexcited",
  defaultResponseLength: "1-3 short sentences",
  operationalStatuses: [
    "Reading the reference...",
    "Found {n} cuts.",
    "Mapping entity windows...",
    "Building the edit plan...",
    "Render started.",
    "Checking continuity...",
    "Estimating cost...",
    "Analyzing footage...",
  ] as const,
};

export function formatOperationalStatus(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`{${key}}`, String(value));
  }
  return result;
}
