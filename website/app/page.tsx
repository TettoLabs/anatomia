import { Hero } from "@/components/Hero";
import { BridgeSection } from "@/components/BridgeSection";
import { BentoGrid } from "@/components/BentoGrid";
import { ProofSection } from "@/components/ProofSection";
import { PricingSection } from "@/components/PricingSection";
import { VisionSection } from "@/components/VisionSection";

export default function HomePage() {
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "var(--bg-gradient)" }}
    >
      <Hero />
      <BridgeSection />
      <BentoGrid />
      <ProofSection />
      <PricingSection />
      <VisionSection />
    </div>
  );
}
