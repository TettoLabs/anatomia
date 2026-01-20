# Start Building Anatomia - Step by Step

**Purpose:** Immediate action plan - no philosophy, just "do this, then this"
**For:** Engineers or AI agents ready to start coding
**Time to first code:** 30 minutes

---

## Prerequisites

**You've already:**
- ✅ Read master_plan/README.md (understand the overview)
- ✅ Read master_plan/VISION.md (understand what we're building)
- ✅ Skimmed master_plan/MVP_ROADMAP.md (understand the phases)

**You're ready to:**
- Write code
- Set up the project
- Build MVP0 (Week 1-2)

---

## Step 1: Set Up Project Structure (30 minutes)

### Create the Repository

```bash
cd ~/Projects
mkdir anatomia-cli
cd anatomia-cli

git init
git branch -M main
```

### Initialize pnpm Workspace (Monorepo)

```bash
# Initialize pnpm
pnpm init

# Create workspace structure
mkdir -p packages/cli
mkdir -p packages/analyzer
mkdir -p packages/generator
mkdir -p packages/types

# Create pnpm-workspace.yaml
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
EOF
```

### Set Up Root package.json

```bash
cat > package.json << 'EOF'
{
  "name": "anatomia-workspace",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  },
  "packageManager": "pnpm@8.15.0"
}
EOF

pnpm install
```

### Create turbo.json (Build Orchestration)

```bash
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "cache": false
    },
    "lint": {
      "cache": false
    }
  }
}
EOF
```

---

## Step 2: Set Up CLI Package (45 minutes)

### Initialize CLI Package

```bash
cd packages/cli

cat > package.json << 'EOF'
{
  "name": "@anatomia/cli",
  "version": "0.1.0",
  "description": "Anatomia CLI - Auto-generated AI assistant framework",
  "bin": {
    "ana": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "inquirer": "^9.2.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "glob": "^10.3.0"
  },
  "devDependencies": {
    "@types/inquirer": "^9.0.0",
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0"
  }
}
EOF

pnpm install
```

### Create TypeScript Config

```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

### Create tsup Config (Bundler)

```bash
cat > tsup.config.ts << 'EOF'
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  shims: true,
  clean: true,
  dts: true,
});
EOF
```

### Create src Directory Structure

```bash
mkdir -p src/commands
mkdir -p src/templates
mkdir -p src/utils

touch src/index.ts
touch src/commands/init.ts
touch src/commands/mode.ts
```

---

## Step 3: Write the Skeleton CLI (1 hour)

### Create Main Entry Point

**File: `packages/cli/src/index.ts`**

```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { modeCommand } from './commands/mode.js';

const program = new Command();

program
  .name('ana')
  .description('Anatomia - Auto-generated AI assistant framework')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize .ana/ folder in current directory')
  .action(initCommand);

program
  .command('mode <name>')
  .description('Display a specific mode')
  .action(modeCommand);

program
  .command('modes')
  .alias('mode list')
  .description('List available modes')
  .action(() => {
    console.log('Available modes:');
    console.log('  - architect  System design and architecture');
    console.log('  - code       Day-to-day coding');
    console.log('  - debug      Debugging and troubleshooting');
    console.log('  - docs       Documentation writing');
    console.log('  - test       Test writing');
  });

program.parse();
```

### Create Init Command (Stub)

**File: `packages/cli/src/commands/init.ts`**

```typescript
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initCommand() {
  console.log(chalk.bold('\nAnatomia Init\n'));

  const spinner = ora('Creating .ana/ folder structure...').start();

  try {
    const anaPath = path.join(process.cwd(), '.ana');

    // Check if .ana/ already exists
    try {
      await fs.access(anaPath);
      spinner.fail('.ana/ folder already exists');
      process.exit(1);
    } catch {
      // Doesn't exist, continue
    }

    // Create folder structure
    await fs.mkdir(anaPath);
    await fs.mkdir(path.join(anaPath, 'context'));
    await fs.mkdir(path.join(anaPath, 'modes'));
    await fs.mkdir(path.join(anaPath, 'learning'));
    await fs.mkdir(path.join(anaPath, 'federation'));

    // Create ENTRY.md (stub for now)
    await fs.writeFile(
      path.join(anaPath, 'ENTRY.md'),
      '# Anatomia Environment\n\nOrientation contract coming soon...\n'
    );

    // Create node.json (stub)
    await fs.writeFile(
      path.join(anaPath, 'node.json'),
      JSON.stringify({
        version: 1,
        node: {
          name: path.basename(process.cwd()),
          role: 'application',
        },
      }, null, 2)
    );

    // Create mode stubs
    const modes = ['architect', 'code', 'debug', 'docs', 'test'];
    for (const mode of modes) {
      await fs.writeFile(
        path.join(anaPath, 'modes', `${mode}.md`),
        `# ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode\n\nMode template coming soon...\n`
      );
    }

    // Create context stubs
    await fs.writeFile(
      path.join(anaPath, 'context', 'main.md'),
      '# Project Context\n\nGenerated context coming soon...\n'
    );

    await fs.writeFile(
      path.join(anaPath, 'context', 'patterns.md'),
      '# Patterns\n\nDetected patterns coming soon...\n'
    );

    await fs.writeFile(
      path.join(anaPath, 'context', 'conventions.md'),
      '# Conventions\n\nDetected conventions coming soon...\n'
    );

    // Create learning stub
    await fs.writeFile(
      path.join(anaPath, 'learning', 'explicit.md'),
      '# Explicit Knowledge\n\nAdd user-taught knowledge here.\n'
    );

    spinner.succeed(chalk.green('Created .ana/ folder structure'));

    console.log('\n' + chalk.bold('Next steps:'));
    console.log('  1. Fill in context files manually (for now)');
    console.log('  2. Reference modes: @.ana/modes/code.md');
    console.log('\nDone!\n');

  } catch (error) {
    spinner.fail('Failed to create .ana/ folder');
    console.error(error);
    process.exit(1);
  }
}
```

### Create Mode Command

**File: `packages/cli/src/commands/mode.ts`**

```typescript
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export async function modeCommand(name: string) {
  const modePath = path.join(process.cwd(), '.ana', 'modes', `${name}.md`);

  try {
    const content = await fs.readFile(modePath, 'utf-8');
    console.log('\n' + content + '\n');
  } catch (error) {
    console.error(chalk.red(`\nMode '${name}' not found.`));
    console.log('\nAvailable modes:');
    console.log('  - architect');
    console.log('  - code');
    console.log('  - debug');
    console.log('  - docs');
    console.log('  - test\n');
    process.exit(1);
  }
}
```

### Test the CLI

```bash
# Build
cd packages/cli
pnpm build

# Link locally (for testing)
npm link

# Test it works
ana --version
ana --help
```

---

## Step 4: Copy Templates (15 minutes)

### Copy ENTRY.md Template

```bash
cd packages/cli
mkdir -p src/templates

# Copy from master_plan
cp ~/Projects/anatomia/master_plan/ENTRY_TEMPLATE.md src/templates/ENTRY.md.hbs
```

**Edit to use Handlebars syntax ({{variable}})** for interpolation.

### Copy Mode Templates

```bash
# Copy all 5 mode templates from MODE_TEMPLATES.md
# Extract each mode section and save as individual .hbs files:

cp [mode content] src/templates/architect.md.hbs
cp [mode content] src/templates/code.md.hbs
cp [mode content] src/templates/debug.md.hbs
cp [mode content] src/templates/docs.md.hbs
cp [mode content] src/templates/test.md.hbs
```

**Note:** Extract the templates from MODE_TEMPLATES.md and convert to Handlebars format.

---

## Step 5: First Dogfood Test (30 minutes)

### Run on a Real Project

```bash
cd ~/Projects/my-test-project
ana init

# Check what was created
ls -la .ana/
cat .ana/ENTRY.md
cat .ana/modes/code.md
```

### Test with Claude Code

**In Claude Code:**
```
@.ana/ENTRY.md
@.ana/modes/code.md

Help me add a new feature following project patterns.
```

**Validate:**
- Does Claude read ENTRY.md first?
- Does Claude understand the mode contract?
- Does Claude respect the constraints?
- Are boundaries clear?

### Iterate

**If ENTRY.md is confusing:** Refine the language
**If mode constraints are unclear:** Add examples
**If AI crosses boundaries:** Strengthen hard constraints
**If everything works:** Move to Week 2

---

## Step 6: Week 2 - Templates Polish (Week 2, Days 8-14)

### Day 8: Refine ENTRY.md Based on Dogfooding

**Update template with:**
- Clearer principle language
- Better examples
- Smoother interpolation

### Days 9-10: Refine Mode Templates

**For each mode:**
- Test it with Claude Code
- Refine language (purpose, outputs, constraints)
- Add project-specific examples
- Ensure <600 lines (size discipline)

### Days 11-12: Context Templates

**Create:**
- main.md template (project overview sections)
- patterns.md template
- conventions.md template

**With interpolation points for auto-generation (coming in MVP1)**

### Days 13-14: MVP0 Complete

**Test on 3 projects:**
- Python/FastAPI project
- Node/Express project
- Go project

**Validate:**
- Init works on all
- ENTRY.md is immediately clear
- Mode contracts feel natural
- Boundaries are respected

**Ship it:** MVP0 done. Foundation is solid.

---

## Step 7: Begin MVP1 (Week 3) - Smart Analysis

**See IMPLEMENTATION_GUIDE.md Week 3 for details.**

**High-level:**
- Build analyzer engine (detect project type, framework, patterns)
- Replace manual context with auto-generated
- Test that generated context is accurate (80%+ target)

**But don't start this until MVP0 is solid.**

---

## Quick Reference

### File Locations During Build

**Templates you're creating:**
```
packages/cli/src/templates/
├── ENTRY.md.hbs              ← From ENTRY_TEMPLATE.md
├── architect.md.hbs          ← From MODE_TEMPLATES.md
├── code.md.hbs               ← From MODE_TEMPLATES.md
├── debug.md.hbs              ← From MODE_TEMPLATES.md
├── docs.md.hbs               ← From MODE_TEMPLATES.md
└── test.md.hbs               ← From MODE_TEMPLATES.md
```

**Master plan docs to reference:**
```
master_plan/
├── ENTRY_TEMPLATE.md         ← Copy this for ENTRY.md
├── MODE_TEMPLATES.md         ← Copy these for modes
├── BEHAVIORAL_PRINCIPLES.md  ← Reference for design decisions
└── IMPLEMENTATION_GUIDE.md   ← Detailed code for each week
```

### Commands to Build

**Week 1-2 (MVP0):**
```bash
ana --version                 # Version info
ana --help                    # Help text
ana init                      # Create .ana/ folder
ana modes                     # List modes
ana mode code                 # Show specific mode
```

**Week 3+ (Later):**
- `ana evolve` - Update context from code changes
- `ana health` - Check context freshness
- `ana nodes` - List connected nodes (MVP1.5)
- `ana query <node> "<q>"` - Query another node (MVP2)
- `ana broadcast "<msg>"` - Notify other nodes (MVP2)

**Build them in order. Don't jump ahead.**

---

## Day 1 Checklist (Today)

**Morning (3 hours):**
- [ ] Create project structure (repos, packages)
- [ ] Set up pnpm workspace
- [ ] Initialize CLI package
- [ ] Install dependencies
- [ ] Create basic file structure

**Afternoon (3 hours):**
- [ ] Write skeleton CLI (index.ts, commands/init.ts)
- [ ] Implement basic `ana init` (creates folders)
- [ ] Write stubs for ENTRY.md and modes
- [ ] Test that `ana init` works
- [ ] Commit: "feat: basic CLI scaffold and init command"

**End of Day 1:**
- ✅ `ana init` creates .ana/ folder
- ✅ Folder has correct structure
- ✅ Stubs exist (will flesh out tomorrow)

---

## Week 1 Milestones

**By end of Day 3:**
- ✅ CLI parses all commands
- ✅ `ana init` creates proper structure
- ✅ Help text works

**By end of Day 5:**
- ✅ ENTRY.md template ready
- ✅ Mode templates created (with contract structure)
- ✅ File writer working

**By end of Day 7:**
- ✅ First dogfood test complete
- ✅ Templates refined based on real use
- ✅ Week 1 deliverable: Working init command

---

## Week 2 Milestones

**By end of Day 10:**
- ✅ ENTRY.md polished and clear
- ✅ All 5 modes have proper contract structure
- ✅ Examples and guidelines in modes

**By end of Day 12:**
- ✅ Context templates ready
- ✅ Interpolation working

**By end of Day 14:**
- ✅ Tested on 3+ real projects
- ✅ Mode boundaries validated
- ✅ MVP0 SHIPPED - Foundation complete

---

## Development Environment Setup

### Recommended Tools

**Editor:** VS Code (or your preference)

**Extensions:**
- TypeScript and JavaScript Language Features
- Prettier
- ESLint

**Terminal:**
- iTerm2 or native Terminal
- Oh My Zsh (optional, for better CLI experience)

### Local Testing Pattern

```bash
# In packages/cli
pnpm build              # Build TypeScript
npm link                # Link globally

# In test project
cd ~/Projects/test-app
ana init                # Test the command

# Make changes
cd ~/Projects/anatomia-cli/packages/cli
# Edit code
pnpm build              # Rebuild
# Test again (no need to re-link)
```

---

## When You Get Stuck

### Reference Documents

**Need to understand WHAT to build?**
→ Read VISION.md

**Need to understand HOW it works?**
→ Read TECHNICAL_ARCHITECTURE.md

**Need exact code examples?**
→ Read IMPLEMENTATION_GUIDE.md (Week 1 section)

**Need template content?**
→ Read ENTRY_TEMPLATE.md and MODE_TEMPLATES.md

**Need to make a design decision?**
→ Read BEHAVIORAL_PRINCIPLES.md (use the tests)

### Common Questions

**Q: Should I add [feature] to ENTRY.md?**
A: Ask: "Does this teach how to think or what to do next?"
   - How to think → Yes
   - What to do next → No (framework creep)

**Q: Mode is getting long (>300 lines). What do I do?**
A: Extract to separate docs, link from mode. Modes teach, they don't contain all knowledge.

**Q: Should AI be able to auto-switch modes?**
A: NO. Human-only. Lock this in. Never compromise.

**Q: Should queries be autonomous?**
A: MVP2: No (human-approved). MVP3: Maybe (with config flag). Start conservative.

---

## Success Criteria (End of Week 2)

### Technical

- ✅ `ana init` runs without errors
- ✅ Creates .ana/ folder with all required files
- ✅ ENTRY.md < 80 lines
- ✅ All 5 modes follow 4-layer contract structure
- ✅ Each mode < 400 lines
- ✅ Templates are Handlebars-ready (interpolation works)

### Functional

- ✅ Tested on 3+ different project types
- ✅ AI reads ENTRY.md and understands .ana/ immediately
- ✅ AI respects mode boundaries (no architect implementing code)
- ✅ Mode switching suggestions are clear
- ✅ We use it ourselves (dogfooding starts)

### Quality

- ✅ Code is clean and readable
- ✅ Tests exist (basic validation)
- ✅ README documents usage
- ✅ No framework creep (passes all BEHAVIORAL_PRINCIPLES tests)

**If all ✅: Ship MVP0. Move to MVP1 (smart analysis).**

---

## Git Workflow

### Commits

**Day 1:**
```bash
git add .
git commit -m "feat: project structure and CLI scaffold

- pnpm workspace setup
- CLI package with commander
- Basic ana init command (stub)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Day 7:**
```bash
git commit -m "feat: ENTRY.md and mode contract templates

- ENTRY.md orientation contract (4-layer structure)
- 5 mode templates with behavioral contracts
- Handlebars interpolation ready

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Day 14 (MVP0 Complete):**
```bash
git commit -m "feat: MVP0 complete - foundation shipped

- ana init creates complete .ana/ structure
- ENTRY.md orients AI immediately
- 5 modes with clear contracts
- Tested on Python, Node, Go projects
- Ready for MVP1 (smart analysis)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git tag v0.1.0-mvp0
```

---

## First Week Focus (Don't Get Distracted)

**DO build:**
- ✅ CLI scaffold
- ✅ `ana init` command
- ✅ ENTRY.md template
- ✅ Mode templates (4-layer contracts)
- ✅ File writer

**DON'T build yet:**
- ❌ Smart analysis (that's MVP1)
- ❌ Federation (that's MVP1.5-2)
- ❌ Auto-exports (that's MVP2)
- ❌ Cloud anything (that's MVP3)
- ❌ Dashboard (that's MVP3)

**Resist feature creep. MVP0 is foundation only.**

---

## The First Commit (Copy This)

```bash
cd ~/Projects/anatomia-cli

# Create initial structure
mkdir -p packages/cli/src/commands
mkdir -p packages/cli/src/templates

# Copy the code from Step 3 above
# ... create all the files ...

# Initialize
pnpm install
cd packages/cli && pnpm build

# Test
npm link
ana --version

# If it works:
git add .
git commit -m "feat: anatomia CLI scaffold

Basic project structure:
- pnpm monorepo with turbo
- CLI package with commander
- ana init command (stub)
- Version and help commands

Next: Implement ENTRY.md and mode templates

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## You're Ready

**Everything you need:**
- ✅ Project structure (Step 1)
- ✅ CLI setup (Step 2)
- ✅ Skeleton code (Step 3)
- ✅ Templates to copy (Step 4)
- ✅ Testing approach (Step 5)
- ✅ Week 2 plan (Step 6)

**Next action:**
1. Open terminal
2. Follow Step 1
3. In 30 minutes you'll have first commit
4. In 2 weeks you'll have MVP0

**The plan is complete. The foundation is designed. Time to build.**

**Start with Step 1. Right now.**
