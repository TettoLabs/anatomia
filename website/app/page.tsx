import { Hero } from "@/components/Hero";
import { BentoGrid } from "@/components/BentoGrid";
import { Roadmap } from "@/components/Roadmap";
import { PricingSection } from "@/components/PricingSection";

export default function HomePage() {
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "var(--bg-gradient)" }}
    >
      <Hero />
      <BentoGrid />
      <Roadmap />
      <PricingSection />
    </div>
  );
}
