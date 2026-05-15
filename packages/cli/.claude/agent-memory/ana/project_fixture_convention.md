---
name: Fixture convention — inline not standalone
description: Scanner test fixtures must use inline data (writeFile to temp dirs), not standalone manifest files that trigger GitHub security scanning
type: project
---

Standalone files that mimic ecosystem manifests (requirements.txt, package.json, etc.) trigger GitHub's security advisory system regardless of where they live in the repo. A `flask==2.0.1` in a test fixture generated real Dependabot alerts. The original fixture files were dead code (loadFixture() deleted during migration) and were removed in hygiene-debt-cleanup (2026-05-12).

**Why:** GitHub's security scanning doesn't distinguish between real dependencies and test fixtures. `dependabot.yml` ignore rules only suppress version update PRs, not security alerts. The only permanent fix is not having scannable manifest files.

**How to apply:** When scoping work that adds new scanner support (Gemfile, go.mod, Cargo.toml, etc.), the scope must specify: parser tests use inline fixture data via writeFile to temp directories, matching the established codebase pattern. Do not create standalone fixture files that mimic ecosystem manifests. A rule was added to testing-standards skill template as part of this scope.
