# Step 2: Write conventions.md

## Goal

Document naming, import, and code style conventions from config files and analyzer data. This file is 90% automatable — config files are ground truth, analyzer provides the rest. An AI mode reading this file should know exactly how to format new code.

## Quality Checklist

Before finishing, verify:
- [ ] Every convention has THREE parts: rule, evidence source, real examples from this codebase
- [ ] Config files cited when present (.prettierrc, .eslintrc, tsconfig.json)
- [ ] Real function/class/file names from the codebase — not generic "use camelCase"
- [ ] Analyzer confidence scores included for inferred conventions
- [ ] Commit format documented with actual commit examples from git log
- [ ] All 4 sections present: Naming Conventions, Import Organization, Code Style, Additional Conventions

## Example

**BAD (generic advice):**
> ## Naming Conventions
> Functions should use camelCase. Classes should use PascalCase.

**GOOD (specific with evidence):**
> ## Naming Conventions
> **Functions:** camelCase (87% consistent from analyzer)
> Examples: `getUserById`, `validateEmail`, `createOrder` (from `src/services/`)
> **Enforced by:** `@typescript-eslint/naming-convention` in `.eslintrc.json`

## Extraction Targets

<target name="naming_conventions">
  Search: Actual function, class, variable, file names in source code
  Files: src/**/*, lib/**/*, app/**/*
  Extract: 3-5 real names per category showing the naming pattern
  <if_not_found>Write: "Inferred from analyzer (confidence: X%)"</if_not_found>
</target>

<target name="config_files">
  Search: Formatter and linter configuration
  Files: .prettierrc*, .eslintrc*, prettier.config.*, eslint.config.*, .editorconfig, tsconfig.json
  Extract: tabWidth, singleQuote, semi, trailingComma, printWidth, indent rules
  <if_not_found>Write: "No config files detected — conventions inferred from code"</if_not_found>
</target>

<target name="import_style">
  Search: Import statements in source files
  Files: Entry points, main source files
  Extract: Absolute vs relative ratio, ordering pattern, path aliases
  <if_not_found>Write: "Mixed or no consistent pattern"</if_not_found>
</target>

<target name="commit_format">
  Search: Recent commit messages
  Files: git log output
  Extract: Format pattern (Conventional Commits, ticket prefix, free-form), consistency %
  <if_not_found>Write: "Not a git repository"</if_not_found>
</target>

## Structure

- 4 H2 sections: Naming Conventions, Import Organization, Code Style, Additional Conventions
- Each naming category: pattern, consistency %, real examples, enforcement source
- Code Style section must cite config files if they exist
- Additional Conventions: git commit format, team conventions from Q&A
- Target: 400-600 lines

## Citation Protocol

Read config files BEFORE citing them. Quote exact settings. Use format:
```
From `.prettierrc`:
```json
{ "tabWidth": 2, "singleQuote": true }
```
```

If no config files exist, cite analyzer with confidence score.

## References

- Exploration results: `.ana/.setup_exploration.md`
- Q&A log: `.ana/.setup_qa_log.md`
- Rules: `.ana/context/setup/rules.md`
