# Step 7: Write debugging.md

## Goal

Document logging, error tracing, common failures, and debugging approach.

**What this file captures:** HOW to debug issues in this project (logs, errors, tribal knowledge about what breaks).

**Automation level:** 30% (logging detectable, failures/workflow need user input)

**Time:** 5-8 minutes

---

## Inputs

1. **Read `.ana/.setup_exploration.md` → Config Files section**
   - Logging libraries in dependencies
   - Error tracking tools (Sentry, Bugsnag) in dependencies

2. **Read scaffold:** `context/debugging.md` (5 section headers, minimal pre-population)

3. **Read templates.md section "7. debugging.md Template"**
   - GOOD shows: Specific failures with diagnosis steps
   - BAD shows: Generic "check logs" advice

4. **Read rules.md:** Line limit 300-500 lines (Quick: 50-500 acceptable)

---

## What to Search For

**Logging setup:**

Search source files for logging configuration:
- Python: `logging.basicConfig`, `logger = logging.getLogger`, logging config files
- TypeScript: `winston.createLogger`, `pino()`, logger setup files
- Go: `log.New`, `zap.New`

Find:
- Logger configuration (format, level, handlers)
- Usage examples (logger.info, logger.error with context)

**Error tracking:**

From dependencies (in exploration):
- Sentry: Search for `Sentry.init`, `@sentry/` imports
- Bugsnag: Search for `Bugsnag.start`
- Rollbar: Search for rollbar config

Extract initialization config if found.

**Console.log fallback:**

If NO structured logging detected:
- Note: "Logging: console.log / print() (no structured logging)"
- Recommendation: Add winston/pino (Node) or logging module (Python)

---

## Questions (Tier + Stage Dependent)

**QUICK MODE:** No questions
- Write minimal debugging.md (50-100 lines)
- Logging detection + placeholder for failures

**GUIDED MODE - STAGE CONDITIONAL:**

**Stage 1 Guided:** No venting question (too early for recurring failures)
- Write minimal debugging.md similar to Quick

**Stage 2+ Guided:** THE VENTING QUESTION

**QV (VALUE 12.0) - Venting:**
```
Anything that keeps breaking or frustrates you about this codebase?

Examples:
  • "Stripe webhooks fail because we don't validate signatures"
  • "Cron jobs timeout with >1000 users"
  • "Database connection pool exhausts during traffic spikes"

(Press Enter to skip if nothing recurring)
```

**This is THE question for Stage 2+ users.** Surfaces tribal knowledge code analysis can never detect.

Wait for response.

**COMPLETE MODE:** Always asks QV + Q13-Q15 + Q19-Q20:

**QV** (venting - same as Stage 2+ Guided)

**Q13 (VALUE 1.0):**
```
Where are production logs and how do you access them?

Example: "Vercel logs in dashboard, filter by function"

(Press Enter to skip)
```

**Q14 (VALUE 1.25):**
```
What error tracking tool do you use and how to access it?

Example: "Sentry, dashboard at sentry.io/myorg/myproject"

(Press Enter to skip)
```

**Q15 (VALUE 0.6):**
```
What commonly breaks and how do you debug it?

(Press Enter to skip)
```

**Q19 (VALUE 1.0):**
```
What observability/APM tools and dashboards do you use?

Example: "New Relic APM, dashboard at newrelic.com/accounts/123"

(Press Enter to skip)
```

**Q20 (VALUE 3.0):**
```
Anything else important about your project I should know?

(Press Enter to skip)
```

---

## Processing Venting Question Answer (QV)

**If user provides specific answer** (e.g., "Stripe webhooks fail because we don't validate signatures"):

1. **Extract WHAT fails:** "Stripe webhooks"
2. **Extract WHY** (if stated): "don't validate signatures"

3. **In Stage 2+ Guided or Complete mode, ask ONE targeted follow-up:**
   (Only when QV was asked and user gave specific answer)
```
When Stripe webhooks fail, how do you usually diagnose it?

(Press Enter if unsure)
```

4. **Format as structured failure mode entry:**

```markdown
**Failure: Stripe Webhook Signature Validation**

**Symptom:**
[Restate what user said: "Webhook events return 400 errors"]
[Expand if user described symptoms in follow-up]

**Cause:**
[User's stated cause: "Webhook signatures not validated"]
[OR if not stated: "Under investigation"]

**Diagnosis:**
[If user described steps in follow-up: "1. Check env vars. 2. Compare with Stripe dashboard secret."]
[If not: Suggest reasonable steps: "1. Check logs for webhook errors. 2. Verify secret matches Stripe dashboard."]

**Fix:**
[If user knows: Include their fix]
[If not: "Fix pending" OR suggest reasonable approach based on stated cause]

**Prevention:**
[If inferrable: "Document webhook secrets in .env.example"]

**Frequency:**
[If user mentioned: "Happens during traffic spikes" or "Happened twice"]
```

**If user gives vague answer** ("things break sometimes", "nothing specific"):

Write honest minimal:
```markdown
## Common Failure Modes

**Note:** No specific recurring failures identified. This is typical for early-stage projects or projects without production users yet.

**To add:** Document failures here as production issues occur and are diagnosed.
```

**Do NOT fabricate** failure modes. Honest > fictional enterprise debugging scenarios.

---

## When Project Is Flat/Minimal

If exploration indicated projectShape = "minimal":

**Likely scenario:**
- console.log / print() logging (no structured logging)
- No error tracking service
- No APM/observability tools
- Vague or no answer to venting question (too early for recurring issues)

**Write honest minimal:**

```markdown
## Logging

**Detected:** console.log (JavaScript/TypeScript) OR print() (Python)

**Note:** No structured logging library detected. Using console/print for logging.

**Recommendation:** Add [winston/pino for Node, logging module for Python] before production for:
- Structured logs (JSON format)
- Log levels (debug, info, warn, error)
- Log aggregation (searchable in production)

## Error Tracing

**Not detected.** No error tracking service (Sentry, Bugsnag, Rollbar) in dependencies.

**Recommendation:** Add error tracking before production to catch and diagnose user-reported issues.

## Common Failure Modes

[Process venting answer if provided, else:]

**Note:** Not yet documented (early-stage project).

## Debugging Workflow

**General approach:** Console/print debugging, reproduce issue, identify cause, fix, test.

**Recommendation:** When team grows, establish systematic debugging process.

## Observability

**Not detected.** No APM tools (New Relic, DataDog, Prometheus) in dependencies.

**Recommendation:** Add observability when reaching production scale for performance monitoring.
```

Honest. Actionable recommendations. Appropriate for target audience (vibe-coded, early-stage).

---

## Verify

1. **Read back:** `context/debugging.md`

2. **Count headers:** 5

3. **Line count:** 300-500 (minimal: 50-500 acceptable)

4. **If QV answered:** Check Common Failure Modes has structured entry (not just user's one sentence)

5. **No placeholders:** Search for "TODO", "..." → expect 0

**If all pass:** Continue.

**If any fail:** Rewrite.

---

## Complete

Report:
```
✓ debugging.md complete ([X] lines) [— with [N] failure modes / — minimal]

[7 of 7 files complete]
```

**All context files written.**

Proceed to final self-check (in SETUP_GUIDE.md orchestrator).
