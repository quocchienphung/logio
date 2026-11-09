/** Spreadsheet labels used by the sample grid. */
export function columnLetters(index: number): string {
  let value = index + 1, text = "";
  while (value > 0) { value--; text = String.fromCharCode(65 + value % 26) + text; value = Math.floor(value / 26); }
  return text;
}
