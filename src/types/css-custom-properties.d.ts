// Allow CSS custom properties (--foo) in React style objects; the reference markup drives many
// graphics through inline custom properties.
import "react";

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
