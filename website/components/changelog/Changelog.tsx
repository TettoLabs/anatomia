import { copy } from "@/lib/copy";
import { splitHeadline } from "@/lib/format";
import styles from "./changelog.module.css";

export function Changelog() {
  const title = splitHeadline(copy.changelog.title);

  return (
    <article className={styles.article}>
      <div className={styles.eyebrow}>{copy.changelog.eyebrow}</div>

      <h1 className={styles.title}>
        {title.map((p, i) =>
          p.em ? <em key={i}>{p.t}</em> : <span key={i}>{p.t}</span>,
        )}
      </h1>

      <div className={styles.entries}>
        {copy.changelog.entries.map((entry) => (
          <div key={entry.version} className={styles.entry}>
            <div className={styles.entryHeader}>
              <span className={styles.entryVersion}>{entry.version}</span>
              <span className={styles.entryDate}>{entry.date}</span>
            </div>
            <ul className={styles.entryList}>
              {entry.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </article>
  );
}
