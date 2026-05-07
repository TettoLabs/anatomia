import type { Metadata } from "next";
import { License } from "@/components/license/License";

export const metadata: Metadata = {
  title: "License · Anatomia",
  description:
    "MIT License — free forever. Read the full license text.",
};

export default function LicensePage() {
  return (
    <main id="main" className="relative pt-[140px] pb-24">
      <License />
    </main>
  );
}
