# Contributing to Anatomia

Thank you for your interest in contributing to Anatomia!

---

## Development Setup

**Prerequisites:**
- Node.js 20+
- pnpm 9+

**Setup:**
```bash
git clone https://github.com/TettoLabs/anatomia.git
cd anatomia
pnpm install
pnpm build
```

**Running locally:**
```bash
cd packages/cli
pnpm link --global
ana --version
```

---

## Project Structure

```
packages/cli/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── commands/          # 12 command implementations (init, scan, setup, etc.)
│   ├── engine/            # Scan engine (detectors, analyzers, parsers)
│   └── utils/             # Shared utilities (validators, scaffold generators)
├── templates/
│   ├── .ana/hooks/        # Hook scripts
│   ├── .claude/agents/    # Agent definitions
│   ├── .claude/skills/    # Skill templates
│   ├── CLAUDE.md          # Project entry point template
│   └── .ana/docs/         # Static docs
├── tests/                 # Vitest test suite
│   ├── commands/          # Command tests
│   ├── engine/            # Engine tests
│   ├── e2e/               # End-to-end tests
│   └── templates/         # Template tests
└── docs/                  # Documentation
```

---

## Testing

**Run tests:**
```bash
pnpm test                # All tests
pnpm test tests/templates/  # Template tests only
```

**Test requirements:**
- All tests must pass before PR
- Add tests for new features
- Maintain ≥80% coverage

**Test structure:**
- Use vitest
- Tests in tests/ directory
- One test file per source file
- Descriptive test names

---

## Modifying Templates

**Template locations:**
- `Agent templates:` templates/.claude/agents/
- `Skill templates:` templates/.claude/skills/
- `Hook scripts:` templates/.ana/hooks/

**Development workflow:**

1. **Edit template file** in `templates/`
2. **Run tests:** `pnpm test`
3. **Test locally:** `pnpm build && cd /tmp && mkdir test && cd test && git init && npm init -y && ana init`
4. **Submit PR** with test results and rationale

**Testing requirements:**
- All automated tests pass (`pnpm test`)
- Coverage remains ≥80%
- Quality rubric maintained (if changed templates)

---

## Template Quality Standards

**All templates must meet:**
- **Length limits:** ENTRY 60-80 lines, modes 90-110 lines, context 30-60 lines
- **Strong constraints:** Use "NEVER", "MUST NOT", "ALWAYS" (not "try to avoid")
- **Examples included:** 5 good + 5 bad per mode
- **Professional tone:** Imperative, clear, no jargon without explanation

See [docs/TEMPLATE_GUIDE.md](./docs/TEMPLATE_GUIDE.md) for details.

---

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

**PR requirements:**
- All tests pass
- Code follows TypeScript strict mode
- Templates maintain quality standards
- Documentation updated if needed

---

## Code Style

- **TypeScript:** Strict mode enforced
- **Formatting:** Prettier (2 spaces, single quotes)
- **Linting:** ESLint
- **Imports:** Use .js extension for ESM imports

---

## Questions?

- Open an issue: https://github.com/TettoLabs/anatomia/issues

---

Thank you for contributing! 🎉
