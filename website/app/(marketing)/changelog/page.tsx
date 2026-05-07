import type { Metadata } from "next";
import { Changelog } from "@/components/changelog/Changelog";

export const metadata: Metadata = {
  title: "Changelog · Anatomia",
  description:
    "What shipped, when, and with what proof. Every release in one place.",
};

export default function ChangelogPage() {
  return (
    <main id="main" className="relative pt-[140px] pb-24">
      <Changelog />
    </main>
  );
}
