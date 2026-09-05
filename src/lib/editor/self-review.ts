export interface ReviewCriteria {
  storyCoherence: number; // 0-10
  clarity: number;
  rhythm: number;
  eyeTrace: number;
  continuity: number;
  actionMatch: number;
  unnecessaryRepetition: number;
  productEmphasis: number;
  soundRelationship: number;
  commercialObjective: number;
}

export interface ReviewResult {
  score: number;
  passed: boolean;
  criteria: ReviewCriteria;
  issues: ReviewIssue[];
  suggestions: string[];
}

export interface ReviewIssue {
  type: "story" | "rhythm" | "continuity" | "audio" | "visual" | "product";
  severity: "minor" | "major" | "blocking";
  timeRange?: { start: number; end: number };
  description: string;
  fix: string;
}

export function buildReviewPrompt(params: {
  timelineDescription: string;
  projectGoal: string;
  brandContext?: string;
}): string {
  return `Review this rough cut for a ${params.projectGoal}.

TIMELINE:
${params.timelineDescription}

${params.brandContext ? `BRAND: ${params.brandContext}` : ""}

Evaluate on these criteria (0-10 each):
1. Story coherence — does the narrative flow?
2. Clarity — is the message clear?
3. Rhythm — does the pacing work?
4. Eye trace — where does the viewer look?
5. Continuity — do shots match?
6. Action match — do movements flow between cuts?
7. Unnecessary repetition — is anything redundant?
8. Product emphasis — is the product/subject well featured?
9. Sound relationship — does audio support video?
10. Commercial objective — does this achieve the goal?

Return a JSON object:
{
  "score": average score 0-100,
  "passed": true if score >= 60,
  "criteria": { "storyCoherence": 0-10, ... },
  "issues": [{ "type": "story|rhythm|continuity|audio|visual|product", "severity": "minor|major|blocking", "timeRange": {"start": 0, "end": 5}, "description": "...", "fix": "..." }],
  "suggestions": ["suggestion1", "suggestion2"]
}`;
}

export function parseReviewResponse(response: string): ReviewResult | null {
  try {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]) as ReviewResult;
    const objMatch = response.match(/\{[\s\S]*"score"[\s\S]*\}/);
    if (objMatch) {
      let braceCount = 0;
      let endIdx = 0;
      for (let i = 0; i < objMatch[0].length; i++) {
        if (objMatch[0][i] === "{") braceCount++;
        if (objMatch[0][i] === "}") braceCount--;
        if (braceCount === 0) { endIdx = i + 1; break; }
      }
      return JSON.parse(objMatch[0].substring(0, endIdx)) as ReviewResult;
    }
  } catch { return null; }
  return null;
}
