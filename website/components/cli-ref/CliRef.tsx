import { copy } from "@/lib/copy";
import { splitHeadline } from "@/lib/format";
import { Formatted } from "@/components/ui/Formatted";
import styles from "./cli-ref.module.css";

export function CliRef() {
  const title = splitHeadline(copy.cliRef.title);

  return (
    <article className={styles.article}>
      <div className={styles.eyebrow}>{copy.cliRef.eyebrow}</div>

      <h1 className={styles.title}>
        {title.map((p, i) =>
          p.em ? <em key={i}>{p.t}</em> : <span key={i}>{p.t}</span>,
        )}
      </h1>

      <p className={styles.body}>
        <Formatted text={copy.cliRef.body} />
      </p>

      <div className={styles.links}>
        <a href={copy.cliRef.githubHref} target="_blank" rel="noopener noreferrer">
          Browse on GitHub
        </a>
      </div>
    </article>
  );
}
