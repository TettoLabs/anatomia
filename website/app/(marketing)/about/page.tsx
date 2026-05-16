import type { Metadata } from "next";
import { About } from "@/components/about/About";

export const metadata: Metadata = {
  title: "About · Anatomia",
  description:
    "One developer, 58 days, $1,085 in AI credits. The story behind Anatomia and the proof that it works.",
};

export default function AboutPage() {
  return (
    <main id="main" className="relative pt-[140px] pb-24">
      <About />
    </main>
  );
}
