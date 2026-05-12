import { defineDocs, defineConfig, frontmatterSchema } from "fumadocs-mdx/config";
import { z } from "zod";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema.extend({
      description: z.string(),
    }),
  },
});

export default defineConfig({
  mdxOptions: {
    // Use defaults — no custom remark/rehype plugins for now
  },
});
