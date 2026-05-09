import styles from "./system.module.css";

type ManPageData = {
  readonly version: string;
  readonly commands: ReadonlyArray<{ readonly cmd: string; readonly desc: string }>;
  readonly moreCount: number;
  readonly moreNames: string;
};

/**
 * ManPage — man-page mock for drawer 04 (The CLI).
 * Renders the header/footer chrome, NAME, SYNOPSIS, COMMANDS sections.
 * Server component.
 */
export function ManPage({ data }: { data: ManPageData }) {
  return (
    <div className={styles.man}>
      {/* Header */}
      <div className={styles.manHeader}>
        <span>ANATOMIA(1)</span>
        <span className={styles.manHeaderMiddle}>User Commands</span>
        <span className={styles.manHeaderLast}>v{data.version}</span>
      </div>

      {/* NAME */}
      <div className={styles.manSection}>
        <div className={styles.manSectionName}>NAME</div>
        <div className={styles.manBody}>
          <p className={styles.manBodyText}>ana — anatomia command-line interface</p>
        </div>
      </div>

      {/* SYNOPSIS */}
      <div className={styles.manSection}>
        <div className={styles.manSectionName}>SYNOPSIS</div>
        <div className={styles.manBody}>
          <p className={styles.manBodyText}>{"ana <command> [options]"}</p>
        </div>
      </div>

      {/* COMMANDS */}
      <div className={`${styles.manSection} ${styles.manSectionLast}`}>
        <div className={styles.manSectionName}>COMMANDS</div>
        <div className={styles.manBody}>
          {data.commands.map((cmd) => (
            <div key={cmd.cmd} className={styles.manCmdRow}>
              <span className={styles.manCmd}>{cmd.cmd}</span>
              <span className={styles.manDesc}>{cmd.desc}</span>
            </div>
          ))}
          <div className={styles.manMore}>
            + {data.moreCount} more · {data.moreNames}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.manFooter}>
        <span>anatomia {data.version}</span>
        <span className={styles.manFooterMiddle}>2026-05</span>
        <span className={styles.manFooterLast}>ANATOMIA(1)</span>
      </div>
    </div>
  );
}
