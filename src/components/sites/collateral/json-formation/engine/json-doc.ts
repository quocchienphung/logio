import { SEARCH_LIMIT, childPath, infoOf, searchValue, typeOf, isBranch, copyTextOf, type JsonNodeInfo, type SearchResult } from "../../../json-viewer/json-model.ts";

/**
 * The reporting document, served to the viewer one page of children at a time. The document is the object the report builder already made in
 * this worker; the page never receives all of it (the reference file is 27 MB) and never parses it.
 */
export const COPY_LIMIT = 4 * 1024 * 1024;

/** The value at a list of keys from the root (array indexes are their numbers as text). */
export function resolve(document: unknown, keys: readonly string[]): unknown {
  let value = document;
  for (const key of keys) {
    if (Array.isArray(value)) value = value[Number(key)];
    else if (value && typeof value === "object") value = (value as Record<string, unknown>)[key];
    else return undefined;
  }
  return value;
}
const pathOf = (rootName: string, keys: readonly string[], document: unknown) => {
  let path = rootName, value = document;
  for (const key of keys) { const array = Array.isArray(value); path = childPath(path, key, array); value = array ? (value as unknown[])[Number(key)] : (value as Record<string, unknown>)[key]; }
  return path;
};
export const rootInfo = (document: unknown, rootName: string): JsonNodeInfo => infoOf(document, rootName, rootName, false);

/** Children `from` to `to` of the branch at `keys`: what a row needs (type, count, preview, shown text), nothing more. */
export function childrenOf(document: unknown, rootName: string, keys: readonly string[], from: number, to: number): JsonNodeInfo[] {
  const value = resolve(document, keys);
  if (!isBranch(typeOf(value))) return [];
  const parent = pathOf(rootName, keys, document), array = Array.isArray(value);
  const entries: [string, unknown][] = array ? (value as unknown[]).slice(from, to).map((item, i) => [String(from + i), item]) : Object.entries(value as object).slice(from, to);
  return entries.map(([key, child]) => infoOf(child, childPath(parent, key, array), key, array));
}
export const searchDocument = (document: unknown, rootName: string, query: string, max = SEARCH_LIMIT): SearchResult => searchValue(document, rootName, query, max);

/** The text a copy button writes: refused (null) above 4 MB, so one click cannot freeze the page. */
export function textOf(document: unknown, keys: readonly string[]): string | null {
  const text = copyTextOf(resolve(document, keys));
  return text.length > COPY_LIMIT ? null : text;
}
