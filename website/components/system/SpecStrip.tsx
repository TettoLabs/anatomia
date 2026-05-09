import styles from "./system.module.css";

/**
 * SpecStrip — horizontal stat strip below the header.
 * Responsive: horizontal at desktop, vertical list at ≤480px.
 * Server component.
 */
export function SpecStrip({
  items,
}: {
  items: ReadonlyArray<{ readonly label: string; readonly value: string }>;
}) {
  return (
    <div className={styles.specStrip}>
      {items.map((item, i) => (
        <span
          key={item.label}
          className={
            i === items.length - 1
              ? `${styles.specItem} ${styles.specItemLast}`
              : styles.specItem
          }
        >
          {item.label}: <span className={styles.specVal}>{item.value}</span>
        </span>
      ))}
    </div>
  );
}
