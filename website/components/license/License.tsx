import { copy } from "@/lib/copy";
import { splitHeadline } from "@/lib/format";
import styles from "./license.module.css";

export function License() {
  const title = splitHeadline(copy.license.title);

  return (
    <article className={styles.article}>
      <div className={styles.eyebrow}>{copy.license.eyebrow}</div>

      <h1 className={styles.title}>
        {title.map((p, i) =>
          p.em ? <em key={i}>{p.t}</em> : <span key={i}>{p.t}</span>,
        )}
      </h1>

      <pre className={styles.licenseBody}>{copy.license.body}</pre>
    </article>
  );
}
