import type { Metadata } from "next";
import { Examples } from "@/components/examples/Examples";

export const metadata: Metadata = {
  title: "Examples · Anatomia",
  description:
    "Worked proof chains for real changes — rate limits, schema migrations, refactors, bugfixes.",
};

export default function ExamplesPage() {
  return (
    <main id="main" className="relative pt-[140px] pb-24">
      <Examples />
    </main>
  );
}
