import type { WordPrediction } from "./types.ts";
export type { WordPrediction } from "./types.ts";

/** Compose the editable sample text from the person's UI choices. No prediction model. */
export function applyReviewChoices(text: string, words: WordPrediction[], picks: Record<number, string>): string {
  let at = 0, out = "";
  for (const word of words) {
    out += text.slice(at, word.start) + (picks[word.index] ?? (word.confident ? word.target : word.text));
    at = word.end;
  }
  return out + text.slice(at);
}
