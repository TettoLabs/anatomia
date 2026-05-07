import type { Metadata } from "next";
import { CliRef } from "@/components/cli-ref/CliRef";

export const metadata: Metadata = {
  title: "CLI Reference · Anatomia",
  description:
    "Every command, every flag, every config key. The complete Anatomia CLI reference.",
};

export default function CliPage() {
  return (
    <main id="main" className="relative pt-[140px] pb-24">
      <CliRef />
    </main>
  );
}
