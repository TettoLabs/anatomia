import styles from "./system.module.css";

type TreeFile = {
  readonly name: string;
  readonly ext?: string;
  readonly anno?: string;
};

type NestedGroup = {
  readonly folder: string;
  readonly files: ReadonlyArray<TreeFile>;
};

export type TreeData = {
  readonly root: string;
  readonly folder: string;
  readonly count: string;
  readonly files: ReadonlyArray<TreeFile>;
  readonly nested?: ReadonlyArray<NestedGroup>;
};

/**
 * FileTree — Finder-style file tree used in drawers 01–03.
 * Supports nested subfolder groups (needed for .ana/context/ in drawer 03).
 * Server component.
 */
export function FileTree({ data }: { data: TreeData }) {
  const allItems: Array<{ file: TreeFile; indent: "root" | "group" | "nested"; isLast: boolean }> = [];

  // Nested groups first (if any)
  if (data.nested) {
    for (const group of data.nested) {
      // The subfolder row
      allItems.push({
        file: { name: group.folder },
        indent: "group",
        isLast: false,
      });
      for (let j = 0; j < group.files.length; j++) {
        allItems.push({
          file: group.files[j],
          indent: "nested",
          isLast: false,
        });
      }
    }
  }

  // Root-level files
  for (let i = 0; i < data.files.length; i++) {
    allItems.push({
      file: data.files[i],
      indent: "group",
      isLast: i === data.files.length - 1 && !data.nested,
    });
  }

  // Mark the very last item
  if (allItems.length > 0) {
    allItems[allItems.length - 1].isLast = true;
  }

  return (
    <div className={styles.tree}>
      {/* Root row */}
      <div className={`${styles.tRow} ${styles.tRoot}`}>
        {data.root}
      </div>

      {/* Folder row with disclosure */}
      <div className={`${styles.tRow} ${styles.tFolder}`}>
        <span className={styles.tFolderName}>{data.folder}</span>
        <span className={styles.tTriRight}>
          <span className={styles.tMeta}>{data.count}</span>
          <span className={styles.tTri}>▾</span>
        </span>
      </div>

      {/* File rows */}
      {allItems.map((item, i) => {
        const indentClass =
          item.indent === "nested"
            ? styles.tNestedGroupRow
            : item.indent === "group"
            ? styles.tGroupRow
            : "";

        // Subfolder rows (no ext means it's a folder)
        if (item.indent === "group" && !item.file.ext && !item.file.anno) {
          return (
            <div
              key={`folder-${i}`}
              className={`${styles.tRow} ${styles.tFolder} ${styles.tGroupRow} ${item.isLast ? styles.tRowLast : ""}`}
            >
              <span className={styles.tFolderName}>{item.file.name}</span>
            </div>
          );
        }

        return (
          <div
            key={`file-${i}`}
            className={`${styles.tRow} ${indentClass} ${item.isLast ? styles.tRowLast : ""}`}
          >
            <span className={styles.tName}>
              {item.file.name}
              {item.file.ext && <span className={styles.tExt}>{item.file.ext}</span>}
            </span>
            {item.file.anno && (
              <span className={styles.tAnno}>{item.file.anno}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
