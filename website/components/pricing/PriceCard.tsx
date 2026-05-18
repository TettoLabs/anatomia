import { Button } from "@/components/ui/Button";
import { WaitlistForm } from "@/components/pricing/WaitlistForm";
import { cn } from "@/lib/utils";
import styles from "./pricing.module.css";

type Plan = typeof import("@/lib/copy").copy.pricing.plans[number];

export function PriceCard({ plan }: { plan: Plan }) {
  const highlighted = "highlighted" in plan && plan.highlighted;
  const isWaitlist = "waitlist" in plan && plan.waitlist;

  return (
    <div className={cn(styles.card, highlighted && styles.cardHighlighted)}>
      <div className="flex items-start justify-between gap-4">
        <div className={styles.cardName}>{plan.name}</div>
        <span className={styles.cardFlag}>{plan.flag}</span>
      </div>
      <div className={styles.cardPrice}>
        <span className={styles.cardPriceValue}>{plan.price}</span>
        {"priceUnit" in plan && (
          <span className={styles.cardPriceUnit}>{plan.priceUnit}</span>
        )}
      </div>
      <div className={styles.cardSub}>{plan.sub}</div>
      <div className={styles.cardFeatures}>
        {plan.features.map((f) => (
          <div key={f} className={styles.cardFeature}>
            <span className={styles.cardFeatureTick}>✓</span>
            <span>{f}</span>
          </div>
        ))}
      </div>
      <div className={styles.cardCta}>
        {isWaitlist ? (
          <WaitlistForm />
        ) : (
          <Button
            variant={highlighted ? "primary" : "secondary"}
            size="md"
            href={"href" in plan.cta ? plan.cta.href : undefined}
            className="w-full justify-center"
          >
            {plan.cta.label}
          </Button>
        )}
      </div>
    </div>
  );
}
