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
npm link
ana --version
```

---

## Project Structure

```
packages/cli/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── commands/          # Command implementations
│   │   ├── init.ts       # ana init command
│   │   └── mode.ts       # ana mode command
│   └── utils/
│       ├── file-writer.ts      # File operations
│       └── template-loader.ts  # Template rendering
├── templates/             # Handlebars templates
│   ├── ENTRY.md.hbs      # Orientation contract
│   ├── node.json.hbs     # Project metadata
│   ├── *.md.hbs          # Mode templates (5 files)
│   └── *.md              # Context templates (3 files)
├── tests/                # Vitest test suite
│   ├── commands/        # Command tests
│   ├── utils/           # Utility tests
│   └── templates/       # Template tests
└── docs/                # Documentation
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
- `.hbs templates:` packages/cli/templates/*.hbs (ENTRY, modes)
- `Static templates:` packages/cli/templates/*.md (context files)

**Development workflow:**

1. **Edit template file**
   ```bash
   # Example: Modify architect mode
   vi packages/cli/templates/architect.md.hbs
   ```

2. **Run tests**
   ```bash
   pnpm test tests/templates/
   # All tests must pass
   ```

3. **Test locally**
   ```bash
   pnpm build
   cd /tmp && mkdir test-template && cd test-template
   ana init
   # Review generated .ana/ files
   ```

4. **Run quality rubric** (for mode changes)
   - Orientation test: If changed ENTRY.md (≤30s target)
   - Boundary test: If changed mode (≤10% violations)
   - Manual review: Professional tone maintained

5. **Submit PR**
   - Include: Test results, rubric results (if applicable), rationale
   - Describe: What changed, why, how quality verified

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
