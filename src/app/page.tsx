import { BusinessSizes } from "@/components/stripe/Business/BusinessSizes";
import { Developers } from "@/components/stripe/Developers/Developers";
import { DomGraphicsRuntime } from "@/components/stripe/DomGraphicsRuntime";
import { Cta } from "@/components/stripe/Cta/Cta";
import { Footer } from "@/components/stripe/Footer/Footer";
import { Hero } from "@/components/stripe/Hero/Hero";
import { News } from "@/components/stripe/News/News";
import { Navigation } from "@/components/stripe/Navigation/Navigation";
import { QueryBox } from "@/components/stripe/QueryBox/QueryBox";
import { SessionsBanner } from "@/components/stripe/Sessions/SessionsBanner";
import { Solutions } from "@/components/stripe/Solutions/Solutions";
import { Stats } from "@/components/stripe/Stats/Stats";

export default function Home() {
  return (
    <>
      <div className="mobile-safari-solid-bars" />
      <Navigation />
      <main>
        <Hero />
        <Solutions />
        <QueryBox />
        <SessionsBanner />
        <Stats />
        <BusinessSizes />
        <Developers />
        <News />
        <Cta />
      </main>
      <Footer />
      <DomGraphicsRuntime />
    </>
  );
}
