# Troubleshooting Guide - Common Detection Issues

**Audience:** Users encountering detection problems
**Updated:** 2026-02-24

---

## Quick Diagnostic

If detection is failing, run with verbose mode first:

```bash
ana analyze --verbose
```

This shows detailed indicators and helps identify which step is failing.

---

## 1. Corrupted Dependency Files

### Symptom
```
Warning: Failed to parse package.json: Unexpected token '{' in JSON
```
or
```
Warning: Failed to parse requirements.txt: Invalid requirement format
```

### Cause
Dependency files contain syntax errors (malformed JSON, invalid TOML, broken Python requirements).

### Solution

**Option 1: Validate the file syntax**
```bash
# For package.json (Node.js)
cat package.json | jq .

# For pyproject.toml (Python)
python -c "import tomli; tomli.load(open('pyproject.toml', 'rb'))"

# For requirements.txt (Python)
pip-compile --dry-run requirements.txt
```

**Option 2: Fix common issues**
- Remove trailing commas in JSON
- Check for unquoted keys
- Verify all brackets/braces are matched
- Ensure requirements.txt has one package per line

**Option 3: Use lock files as fallback**
```bash
# Generate clean requirements from installed packages
pip freeze > requirements.txt

# Regenerate package.json from package-lock.json
npm install
```

### Example
```
Before (broken):
{
  "dependencies": {
    "express": "^4.0.0",  <-- trailing comma
  }
}

After (fixed):
{
  "dependencies": {
    "express": "^4.0.0"
  }
}
```

---

## 2. Permission Denied (EACCES)

### Symptom
```
Error: EACCES: permission denied, open '/path/to/package.json'
```
or
```
Warning: Cannot read directory: /path/to/project
```

### Cause
Anatomia cannot read dependency files due to file system permissions.

### Solution

**Option 1: Fix file permissions**
```bash
# Make dependency files readable
chmod 644 package.json
chmod 644 requirements.txt
chmod 644 pyproject.toml

# Make project directory readable
chmod 755 /path/to/project
```

**Option 2: Run with appropriate user**
```bash
# Check current permissions
ls -la package.json

# If owned by another user, change ownership
sudo chown $USER:$USER package.json
```

**Option 3: Copy project to accessible location**
```bash
# If project is in restricted directory
cp -r /restricted/project ~/my-project
cd ~/my-project
ana analyze
```

### Example
```bash
# Check permissions
$ ls -la package.json
---------- 1 root root 234 Feb 24 10:00 package.json

# Fix permissions
$ chmod 644 package.json
$ ls -la package.json
-rw-r--r-- 1 user user 234 Feb 24 10:00 package.json

# Now analyze works
$ ana analyze
```

---

## 3. No Framework Detected (Null Result)

### Symptom
```
Framework: None detected
Confidence: 0%
```

### Cause
This is NOT an error. It means:
- Project is a library (not a web framework)
- Dependencies don't include recognized frameworks
- Framework detection confidence is too low

### Solution

**Option 1: Verify this is expected**
```bash
# Check what packages you have
cat requirements.txt
cat package.json

# If you see only utilities (pytest, eslint), this is correct
```

**Option 2: Add framework dependency if missing**
```bash
# Python - add your framework
pip install fastapi
pip freeze > requirements.txt

# Node.js - add your framework
npm install express
```

**Option 3: Check verbose output for hints**
```bash
ana analyze --verbose

# Look for indicators that were found but didn't meet threshold
```

### Example
```bash
# Library project (expected null):
$ cat requirements.txt
pytest==7.4.0
black==23.0.0
mypy==1.5.0

$ ana analyze
Framework: None detected  # Correct - this is a library

# Web project (should detect):
$ cat requirements.txt
fastapi==0.100.0
uvicorn==0.23.0

$ ana analyze
Framework: fastapi
Confidence: 95%
```

---

## 4. Low Confidence Detection (<0.5)

### Symptom
```
Framework: fastapi
Confidence: 35%

Error: Low confidence (0.35)  # with --strict flag
```

### Cause
- Ambiguous signals (multiple frameworks in dependencies)
- Missing key indicator files
- Incomplete project setup

### Solution

**Option 1: Add framework-specific files**
```bash
# Python FastAPI - add main.py with FastAPI import
cat > main.py << 'EOF'
from fastapi import FastAPI

app = FastAPI()
EOF

# Node.js Next.js - add next.config.js
cat > next.config.js << 'EOF'
module.exports = {}
EOF
```

**Option 2: Remove conflicting dependencies**
```bash
# If you have both Flask and FastAPI, remove unused one
pip uninstall flask

# Regenerate requirements
pip freeze > requirements.txt
```

**Option 3: Check verbose output to understand why**
```bash
ana analyze --verbose

# Shows all indicators found:
# Indicators: fastapi dependency (0.3), uvicorn detected (0.05)
# Total: 0.35
```

### Example
```bash
# Before (low confidence):
$ cat requirements.txt
fastapi==0.100.0

$ ana analyze
Confidence: 30%  # Only dependency found

# After (high confidence):
$ cat main.py
from fastapi import FastAPI
app = FastAPI()

$ ana analyze
Confidence: 95%  # Dependency + import + app creation
```

---

## 5. Multiple Frameworks (Ambiguous Detection)

### Symptom
```
# Detects Flask, but you're using FastAPI
Framework: flask
Confidence: 60%
```
or
```
# Has both frameworks in dependencies
requirements.txt contains: flask==2.3.0 AND fastapi==0.100.0
```

### Cause
Project dependencies include multiple frameworks. Anatomia uses priority order (FastAPI before Flask, Next.js before React, Nest.js before Express).

### Solution

**Option 1: Remove unused framework**
```bash
# If not using Flask
pip uninstall flask
pip freeze > requirements.txt
```

**Option 2: Verify detection order is correct**
```bash
# Priority order (Python):
# 1. FastAPI (highest)
# 2. Django
# 3. Flask
# If both exist, FastAPI wins

ana analyze --verbose
# Check which framework has more indicators
```

**Option 3: Separate into monorepo**
```bash
# If using both frameworks (microservices)
mkdir -p services/api-fastapi
mkdir -p services/api-flask

# Move each to separate directory
mv fastapi_code services/api-fastapi/
mv flask_code services/api-flask/

# Analyze each separately
ana analyze services/api-fastapi
ana analyze services/api-flask
```

### Example
```bash
# Ambiguous (both frameworks):
$ cat requirements.txt
flask==2.3.0
fastapi==0.100.0

$ ana analyze
Framework: fastapi  # FastAPI has higher priority
Confidence: 70%

# Clear (one framework):
$ pip uninstall flask
$ pip freeze > requirements.txt
$ ana analyze
Framework: fastapi
Confidence: 95%
```

---

## 6. Monorepo Detection Failed

### Symptom
```
# Monorepo not detected, but you have multiple packages
Framework: None detected
```
or
```
Warning: Multiple packages detected without tool (3 packages)
Suggestion: Consider using pnpm, Nx, or Turborepo
```

### Cause
- Missing monorepo configuration file
- Workspace patterns not configured
- Packages outside standard locations

### Solution

**Option 1: Add workspace configuration**
```bash
# pnpm (recommended)
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
  - 'apps/*'
EOF

# npm/yarn
cat > package.json << 'EOF'
{
  "workspaces": ["packages/*", "apps/*"]
}
EOF

# Lerna
cat > lerna.json << 'EOF'
{
  "packages": ["packages/*"],
  "version": "independent"
}
EOF
```

**Option 2: Use standard directory structure**
```bash
# Move packages to standard location
mkdir packages
mv my-package-1 packages/
mv my-package-2 packages/
```

**Option 3: Analyze specific package instead**
```bash
# Instead of analyzing root
cd packages/my-web-app
ana analyze
```

### Example
```bash
# Before (not detected):
$ tree -L 2
.
├── api/
│   └── package.json
├── web/
│   └── package.json
└── package.json

$ ana analyze
# Treats as single project, misses packages

# After (detected):
$ cat pnpm-workspace.yaml
packages:
  - 'api'
  - 'web'

$ ana analyze
pnpm monorepo detected (2 workspace patterns)
```

---

## 7. Wrong Framework Detected

### Symptom
```
# Expected Next.js, got React
Framework: react
Confidence: 80%
```

### Cause
- Missing Next.js configuration files
- Detection runs in wrong order (React detected before Next.js is checked)
- Next.js dependency not in package.json

### Solution

**Option 1: Verify Next.js files exist**
```bash
# Next.js requires next dependency
cat package.json | grep next

# And should have next.config.js or pages/app directory
ls next.config.js
ls -d pages/ app/
```

**Option 2: Add missing Next.js files**
```bash
# Add next.config.js
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig
EOF
```

**Option 3: Check verbose output**
```bash
ana analyze --verbose

# Shows detection order:
# 1. Checking Next.js... not found
# 2. Checking React... found (react dependency)
```

### Example
```bash
# Wrong detection:
$ cat package.json
{
  "dependencies": {
    "react": "^18.0.0",
    "next": "^14.0.0"  # Has Next.js!
  }
}

$ ls
# Missing next.config.js

$ ana analyze
Framework: react  # Wrong!

# Fix:
$ touch next.config.js
$ ana analyze
Framework: nextjs  # Correct!
Confidence: 95%
```

---

## 8. Slow Detection (>2 seconds)

### Symptom
```
# Analysis takes >2 seconds
$ time ana analyze
...
real    0m5.234s  # Too slow
```

### Cause
- Large codebase with many files
- Slow file system (network drives)
- Import scanning enabled on huge projects

### Solution

**Option 1: Skip import scanning**
```bash
# Fastest - skip code scanning, use dependencies only
ana analyze --skip-import-scan
```

**Option 2: Analyze from faster location**
```bash
# If on network drive, copy locally
cp -r /network/project /tmp/project
cd /tmp/project
ana analyze
```

**Option 3: Use .gitignore to reduce scan scope**
```bash
# Anatomia respects .gitignore
# Add large directories to .gitignore
cat >> .gitignore << 'EOF'
node_modules/
.next/
dist/
build/
coverage/
EOF
```

### Example
```bash
# Before (slow):
$ time ana analyze
Analyzing 10,000 files...
real    0m12.456s

# After (fast):
$ time ana analyze --skip-import-scan
Analyzing dependencies only...
real    0m0.834s

# Or with cached .gitignore:
$ cat .gitignore
node_modules/
dist/

$ time ana analyze
Analyzing 234 files...  # Reduced scope
real    0m1.123s
```

---

## 9. No Dependency Files Found

### Symptom
```
No Python dependency files found
Suggestion: Create requirements.txt: pip freeze > requirements.txt
```

### Cause
- Fresh project without dependencies installed
- Dependencies in non-standard location
- Using alternative package manager

### Solution

**Option 1: Generate dependency file**
```bash
# Python - from virtualenv
pip freeze > requirements.txt

# Python - from pyproject.toml
pip-compile pyproject.toml

# Node.js - from node_modules
npm list --json > package-lock.json
npm install  # Regenerates package.json if missing
```

**Option 2: Point to correct dependency file**
```bash
# If using poetry (Python)
poetry export -f requirements.txt > requirements.txt

# If using pipenv
pipenv lock -r > requirements.txt
```

**Option 3: Create minimal dependency file**
```bash
# Python minimal
cat > requirements.txt << 'EOF'
fastapi==0.100.0
uvicorn==0.23.0
EOF

# Node.js minimal
cat > package.json << 'EOF'
{
  "dependencies": {
    "express": "^4.18.0"
  }
}
EOF
```

### Example
```bash
# Before (no files):
$ ls
main.py  app.py  utils.py

$ ana analyze
No Python dependency files found

# After (dependencies added):
$ pip freeze > requirements.txt
$ ls
main.py  app.py  requirements.txt

$ ana analyze
Framework: fastapi
Confidence: 85%
```

---

## 10. Unsupported Project Type

### Symptom
```
Project Type: unknown
Framework: None detected
Confidence: 0%
```

### Cause
Project uses unsupported language/runtime (e.g., Java, C#, Ruby on Rails with non-standard setup).

### Solution

**Option 1: Check supported languages**
```bash
# Currently supported:
# - Python (Django, FastAPI, Flask)
# - Node.js (Next.js, Express, Nest.js, React)
# - Go (Gin, Echo, Chi, Fiber)
# - Rust (Actix, Rocket, Axum)
```

**Option 2: Verify language indicators exist**
```bash
# Python - needs .py files + dependency files
ls *.py
ls requirements.txt pyproject.toml Pipfile

# Node.js - needs package.json
ls package.json

# Go - needs go.mod
ls go.mod

# Rust - needs Cargo.toml
ls Cargo.toml
```

**Option 3: File issue for new language support**
```bash
# If language should be supported, report it:
# https://github.com/your-org/anatomia/issues
```

### Example
```bash
# Unsupported (Java):
$ ls
pom.xml  src/main/java/

$ ana analyze
Project Type: unknown  # Java not yet supported

# Supported (Python):
$ ls
requirements.txt  main.py

$ ana analyze
Project Type: python
Framework: fastapi
```

---

## 11. Encoding Errors (Non-UTF-8 Files)

### Symptom
```
Warning: Failed to parse requirements.txt: UnicodeDecodeError
```

### Cause
Dependency file contains non-UTF-8 characters.

### Solution

**Option 1: Convert file to UTF-8**
```bash
# Using iconv
iconv -f ISO-8859-1 -t UTF-8 requirements.txt > requirements_utf8.txt
mv requirements_utf8.txt requirements.txt

# Or with dos2unix (for Windows line endings)
dos2unix requirements.txt
```

**Option 2: Remove problematic characters**
```bash
# Open in editor and fix
vim requirements.txt
# Remove special characters/emojis from comments
```

**Option 3: Regenerate file**
```bash
# Cleanly regenerate from installed packages
pip freeze > requirements.txt
```

### Example
```bash
# Before (encoding error):
$ file requirements.txt
requirements.txt: ISO-8859 text

$ ana analyze
Warning: Failed to parse requirements.txt: UnicodeDecodeError

# After (UTF-8):
$ iconv -f ISO-8859-1 -t UTF-8 requirements.txt > temp.txt
$ mv temp.txt requirements.txt
$ file requirements.txt
requirements.txt: UTF-8 Unicode text

$ ana analyze
Framework: flask
```

---

## 12. Circular Dependencies in Monorepo

### Symptom
```
Warning: Circular dependency detected between packages
```

### Cause
Monorepo packages reference each other in circular manner (A depends on B, B depends on A).

### Solution

**Option 1: Break circular dependency**
```bash
# Refactor to use shared package
mkdir packages/shared
# Move shared code to packages/shared
# Update both A and B to depend on shared
```

**Option 2: Analyze packages individually**
```bash
# Instead of analyzing root
cd packages/package-a
ana analyze

cd ../package-b
ana analyze
```

**Option 3: Check monorepo tool configuration**
```bash
# Verify workspace configuration is correct
cat pnpm-workspace.yaml

# Check for accidental self-references
grep -r '"package-a"' packages/package-a/package.json
```

### Example
```bash
# Problem:
packages/
  api/
    package.json: { "dependencies": { "web": "*" } }
  web/
    package.json: { "dependencies": { "api": "*" } }

# Solution:
packages/
  shared/
    package.json: { "name": "shared" }
  api/
    package.json: { "dependencies": { "shared": "*" } }
  web/
    package.json: { "dependencies": { "shared": "*" } }
```

---

## Still Having Issues?

### Enable Debug Mode
```bash
# Maximum verbosity
ana analyze --verbose

# Check specific phase
ana analyze --verbose 2>&1 | grep "phase:"
```

### Check System Requirements
```bash
# Node.js version (requires 18+)
node --version

# File permissions
ls -la package.json requirements.txt

# Disk space
df -h .
```

### Report Issues
If none of these solutions work, file an issue with:
1. Output of `ana analyze --verbose`
2. Contents of dependency files (package.json, requirements.txt)
3. Operating system and Node.js version
4. Project structure (`tree -L 2 -I node_modules`)

---

## Related Documentation

- **README.md** - Installation and basic usage
- **TEMPLATE_GUIDE.md** - How templates work
- **API.md** - Programmatic usage

---

## Quick Reference

| Symptom | Quick Fix |
|---------|-----------|
| Parse error | Validate JSON/TOML syntax with linter |
| Permission denied | `chmod 644 package.json` |
| No framework detected | Check if library project (expected) |
| Low confidence | Add framework-specific files (main.py, next.config.js) |
| Multiple frameworks | Remove unused dependencies |
| Monorepo not detected | Add pnpm-workspace.yaml |
| Wrong framework | Verify framework config files exist |
| Slow detection | Use `--skip-import-scan` flag |
| No dependencies found | Run `pip freeze > requirements.txt` |
| Unsupported language | Check language is supported |
| Encoding error | Convert file to UTF-8 with `iconv` |
| Circular dependency | Analyze packages individually |
