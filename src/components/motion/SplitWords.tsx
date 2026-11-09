import { Fragment, type CSSProperties } from "react";

/**
 * Splits a text run into word spans for the hero's word-by-word blur reveal (src/styles/motion.css).
 * The text itself is unchanged: words keep their normal spaces, so wrapping and selection behave as
 * before. `start` continues the stagger index across several runs of one headline.
 */
export function SplitWords({ text, start = 0 }: { text: string; start?: number }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span className="sr-word" style={{ "--sr-i": start + i } as CSSProperties}>
            {word}
          </span>
        </Fragment>
      ))}
    </>
  );
}
