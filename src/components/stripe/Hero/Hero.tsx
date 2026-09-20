import { ButtonArrow } from "@/components/stripe/icons";
import { GdpCounter } from "./GdpCounter";
import { HeroWave } from "./HeroWave";
import { LogoCarousel } from "./LogoCarousel";

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      fill="none"
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      <path
        fill="#4285f4"
        d="M11.8846 4.91113H6.11987v2.31403h3.30546c-.06676.36934-.20976.72135-.42019 1.03438s-.48385.58047-.80343.78585V10.551h1.96699c.6038-.57079 1.0787-1.2598 1.394-2.02239.4722-1.14225.5273-2.4075.3219-3.61748"
      />
      <path
        fill="#34a853"
        d="M6.11985 12c1.64722 0 3.04228-.5278 4.04885-1.449L8.20168 9.0454c-.61936.39256-1.34496.59231-2.08183.5731-.76295-.00928-1.50387-.25249-2.11917-.69564-.61531-.44314-1.07424-1.06406-1.31264-1.77595H.652344v1.53908C1.16135 9.68188 1.9422 10.5192 2.90769 11.1044c.9655.5852 2.07762.8953 3.21216.8956"
      />
      <path
        fill="#fbbc04"
        d="M2.68809 7.14693c-.25717-.74696-.25717-1.55625 0-2.30321v-1.5499H.652386c-.427544.83671-.65018873 1.75993-.65018873 2.6961S.224842 7.84931.652386 8.68602z"
      />
      <path
        fill="#ea4335"
        d="M6.11985 2.37211c.87133-.0146 1.71351.30816 2.34449.89853l1.75046-1.71879C9.51693.932184 8.68295.478902 7.77771.227229 6.87246-.0244442 5.92032-.0677314 4.99527.100731c-.92505.168462-1.79809.544137-2.5513 1.097839-.75321.55369-1.3663 1.2705-1.791626 2.09473L2.68804 4.84371c.2384-.71189.69733-1.33281 1.31264-1.77595.6153-.44315 1.35622-.68636 2.11917-.69565"
      />
    </svg>
  );
}

/** The heading is drawn twice: a background copy and a hard-light foreground clone so the ribbon tints the type. */
function Title({ variant }: { variant: "background" | "foreground" }) {
  return (
    <h1
      className={`hds-heading hero-section__title hero-section__title--${variant} hds-heading--xl`}
      aria-hidden={variant === "foreground"}
    >
      <em className="hero-section__title-main">
        Financial infrastructure to grow your revenue.
      </em>{" "}
      <span className="hero-section__title-copy">
        Accept payments, offer financial services, and implement custom revenue
        models—from your first transaction to your billionth.
      </span>
    </h1>
  );
}

export function Hero() {
  return (
    <section className="hds-color-mode hero-section-container section section--white hds-mode--light">
      <div className="section-container hero-section__layout">
        <div className="hero-section__layout-grid">
          <GdpCounter />
          <Title variant="background" />
          <Title variant="foreground" />
          <div className="hds-button-group hero-section__actions">
            <a
              className="hds-button hds-button--primary"
              href="https://dashboard.stripe.com/register"
            >
              Get started
              <ButtonArrow />
            </a>
            <a
              className="hds-button hero-section__button--google hds-button--secondary"
              href="https://dashboard.stripe.com/login/oauth/google/init"
            >
              <GoogleIcon />
              Sign up with Google
            </a>
          </div>
        </div>
      </div>
      <div
        className="section-background hero-section__background"
        aria-hidden="true"
      >
        <span className="hero-section__fullbleed-line hero-section__fullbleed-line--top" />
        <span className="hero-section__fullbleed-line hero-section__fullbleed-line--bottom" />
        <HeroWave />
      </div>
      <LogoCarousel />
    </section>
  );
}
