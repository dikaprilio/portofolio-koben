import { Hero } from "@/components/site/hero";
import { Marquee } from "@/components/site/marquee";
import { Missions } from "@/components/site/missions";
import { Origin } from "@/components/site/origin";
import { Powers } from "@/components/site/powers";
import { Signal } from "@/components/site/signal";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Trophies } from "@/components/site/trophies";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Marquee />
        <Origin />
        <Powers />
        <Missions />
        <Trophies />
        <Signal />
      </main>
      <SiteFooter />
    </>
  );
}
