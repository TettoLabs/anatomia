import { copy } from "@/lib/copy";
import { splitHeadline } from "@/lib/format";
import { Formatted } from "@/components/ui/Formatted";
import styles from "./examples.module.css";

export function Examples() {
  const title = splitHeadline(copy.examples.title);

  return (
    <article className={styles.article}>
      <div className={styles.eyebrow}>{copy.examples.eyebrow}</div>

      <h1 className={styles.title}>
        {title.map((p, i) =>
          p.em ? <em key={i}>{p.t}</em> : <span key={i}>{p.t}</span>,
        )}
      </h1>

      <p className={styles.body}>
        <Formatted text={copy.examples.body} />
      </p>
    </article>
  );
}
