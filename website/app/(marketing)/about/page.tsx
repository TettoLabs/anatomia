import type { Metadata } from "next";
import { About } from "@/components/about/About";

export const metadata: Metadata = {
  title: "About · Anatomia",
  description:
    "Two people, one idea. The team behind Anatomia and why we built it.",
};

export default function AboutPage() {
  return (
    <main id="main" className="relative pt-[140px] pb-24">
      <About />
    </main>
  );
}
