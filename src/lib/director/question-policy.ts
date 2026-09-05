export interface QuestionPolicy {
  askOneAtATime: boolean;
  neverAskKnown: boolean;
  prioritizeHighValue: boolean;
}

export const DEFAULT_QUESTION_POLICY: QuestionPolicy = {
  askOneAtATime: true,
  neverAskKnown: true,
  prioritizeHighValue: true,
};

export function shouldAskQuestion(params: {
  knownFacts: string[];
  currentQuestion: string;
  ambiguityLevel: "low" | "medium" | "high";
  costImpact: "none" | "low" | "medium" | "high";
}): "ask" | "infer" | "propose" {
  if (params.ambiguityLevel === "high" && params.costImpact === "high") return "ask";
  if (params.knownFacts.some((f) => params.currentQuestion.toLowerCase().includes(f.toLowerCase()))) return "infer";
  if (params.ambiguityLevel === "low") return "infer";
  return "ask";
}
