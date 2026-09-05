export interface ExpertiseProfile {
  level: "beginner" | "intermediate" | "expert";
  signals: string[];
  vocabularyMatch: number;
}

const EXPERT_SIGNALS = [
  /\b\d+:\d{2}(:\d{2})?\b/,
  /\b(lens|dolly|tracking|jib|crane|steadicam|gimbal|handheld|tripod)\b/i,
  /\b(blocking|continuity|eye.?trace|screen.?direction)\b/i,
  /\b(grade|lut|color.?space|log|rec709|aces)\b/i,
  /\b(shutter|aperture|iso|focal.?length|depth.?of.?field)\b/i,
  /\b(j.?cut|l.?cut|cutaway|reaction.?shot|establishing)\b/i,
  /\b(ducking|compressor|limiter|eq|stem|mix|master)\b/i,
  /\b(preserve|protect|lock|keep)\b.*\b(cut|shot|take|frame|block)\b/i,
];

const BEGINNER_SIGNALS = [
  /\b(cinematic|premium|luxury|high.?end|expensive)\b/i,
  /\b(make.?it.?look|feel.?like|make.?it.?more)\b/i,
  /\b(what.?can.?you|is.?it.?possible|how.?do)\b/i,
  /\b(i.?have.?no.?idea|i.?don'?t.?know)\b/i,
];

export function inferExpertise(messages: string[]): ExpertiseProfile {
  const allText = messages.join(" ");
  const expertMatches = EXPERT_SIGNALS.filter((p) => p.test(allText)).length;
  const beginnerMatches = BEGINNER_SIGNALS.filter((p) => p.test(allText)).length;
  const vocabularyMatch = Math.min(1, expertMatches / 4);
  let level: ExpertiseProfile["level"];
  if (expertMatches >= 3) level = "expert";
  else if (beginnerMatches >= 2 && expertMatches === 0) level = "beginner";
  else level = "intermediate";
  const signals: string[] = [];
  if (expertMatches > 0) signals.push(`${expertMatches} expert signals`);
  if (beginnerMatches > 0) signals.push(`${beginnerMatches} beginner signals`);
  return { level, signals, vocabularyMatch };
}

export function getExpertiseInstructions(profile: ExpertiseProfile): string {
  switch (profile.level) {
    case "expert":
      return "This user is a film/production professional. Use technical vocabulary immediately. Expose technical detail when requested. Do not teach basics. Respond at their level.";
    case "beginner":
      return "This user is a beginner. Translate production decisions into outcomes. Offer small choices. Take initiative. Hide technical controls. Use plain language.";
    default:
      return "This user has mixed expertise. Be concise. Match their vocabulary level. Don't over-explain or under-explain.";
  }
}
