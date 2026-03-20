# Migration Guide: v0.1.0 → v0.2.0

## Overview

Version 0.2.0 is a complete rewrite of `ana init`. The old interactive prompt system has been replaced with an analyzer-driven automatic system.

## Breaking Changes

### 1. ana init No Longer Prompts

**v0.1.0:**
```bash
$ ana init
? What is your project name? my-project
? What type of project is this? node
? Framework (optional): nextjs
...
```

**v0.2.0:**
```bash
$ ana init
Analyzing project...
  ✓ Analysis complete
  Framework: Next.js
  ...
✅ .ana/ framework initialized
```

**Migration:** Remove any scripts that pipe input to `ana init`. The command now runs analyzer automatically.

### 2. ENTRY.md Generation Moved

**v0.1.0:** `ana init` created ENTRY.md immediately

**v0.2.0:** ENTRY.md created by `ana setup complete` after setup

**Migration:** After running `ana init`, reference `@.ana/modes/setup.md` to complete setup, then run `ana setup complete` to generate ENTRY.md.

### 3. Flags Changed

**Removed:**
- `-y, --yes` (init is now always non-interactive)

**Added:**
- `--force` (overwrite .ana/, preserves .state/)
- `--skip-analysis` (create empty scaffolds if analyzer unavailable)

**Migration:**
```bash
# Old: ana init -y
# New: ana init (no flag needed)

# Old: (prompted to overwrite)
# New: ana init --force
```

### 4. File Structure Changes

**Removed:**
- `node.json` (replaced by `.meta.json`)

**Added:**
- `context/analysis.md` (analyzer output)
- `.meta.json` (framework metadata)
- `.state/snapshot.json` (analyzer baseline)
- `context/setup/` (setup files)
- More context scaffolds (7 total, was 2)

**Migration:** Old .ana/ structures are incompatible. Use `ana init --force` to recreate with new structure.

## Migration Steps

### For Existing Projects

```bash
cd your-project/

# 1. Backup .state/ if you have sessions (STEP 3 only)
cp -r .ana/.state .ana-state-backup

# 2. Remove old .ana/
rm -rf .ana/

# 3. Run new init
ana init

# 4. Run setup in Claude Code
# Reference: @.ana/modes/setup.md

# 5. Complete setup
ana setup complete

# 6. Verify
ls .ana/ENTRY.md  # Should exist

# 7. Restore .state/ if backed up (STEP 3 only)
# mv .ana-state-backup .ana/.state
```

### For Scripts/Automation

Remove any scripts that:
- Pipe answers to `ana init` (no longer accepts input)
- Parse init prompts (no prompts to parse)
- Use `-y` flag (removed)

Update to:
```bash
# Non-interactive by default
ana init

# Or with flags
ana init --force --skip-analysis
```

## New Features

### Analyzer Integration

Init now runs the analyzer (STEP 2.1 + 2.2) automatically:
- Detects framework (20+ supported)
- Detects patterns (error handling, validation, database, auth, testing)
- Detects conventions (naming, imports, indentation)
- Pre-populates scaffolds with findings

### Setup Validation

New `ana setup complete` validates context files:
- Checks all 7 files completed (no scaffold markers)
- Cross-references against analyzer data
- Generates ENTRY.md only after validation passes

### .state/ Directory

New `.state/` directory for STEP 3 features:
- `snapshot.json` - Analyzer baseline for drift detection
- Future: `ana.db` for session history (STEP 3)

## Support

Questions? Open an issue: https://github.com/TettoLabs/anatomia/issues
