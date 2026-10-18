import { pageTransitionRuntime } from "./pageTransitionRuntime";

/** Inlined in <head> so the new document registers `pagereveal` before its first render. */
export function PageTransitionScript() {
  return <script dangerouslySetInnerHTML={{ __html: `(${pageTransitionRuntime.toString()})();` }} />;
}
