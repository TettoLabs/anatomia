import { copy } from "@/lib/copy";
import { splitHeadline } from "@/lib/format";
import { Formatted } from "@/components/ui/Formatted";
import styles from "./about.module.css";

export function About() {
  const title = splitHeadline(copy.about.title);

  return (
    <article className={styles.article}>
      <div className={styles.eyebrow}>{copy.about.eyebrow}</div>

      <h1 className={styles.title}>
        {title.map((p, i) =>
          p.em ? <em key={i}>{p.t}</em> : <span key={i}>{p.t}</span>,
        )}
      </h1>

      {copy.about.body.map((para, i) => (
        <p key={i} className={`${styles.body} ${i === 0 ? styles.lede : ""}`}>
          <Formatted text={para} />
        </p>
      ))}
    </article>
  );
}
