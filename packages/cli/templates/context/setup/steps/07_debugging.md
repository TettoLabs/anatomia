# Step 7: Write debugging.md

## Goal

Document how to investigate issues — logging setup, error tracing, common failures, debugging workflow. This file captures tribal knowledge about what breaks and how to diagnose it. The "venting question" surfaces recurring issues that code analysis can never detect.

## Quality Checklist

Before finishing, verify:
- [ ] Logging setup documented with config location and usage examples
- [ ] Error tracking service documented (Sentry, Bugsnag) or noted as absent
- [ ] Common failure modes structured: symptom, cause, diagnosis, fix
- [ ] Debugging workflow documented for this project
- [ ] Observability tools documented or recommended
- [ ] All 5 sections present (or honest placeholders for early-stage projects)

## Example

**BAD (generic):**
> ## Debugging Workflow
> Check logs, find error, fix bug.

**GOOD (specific with tribal knowledge):**
> ## Common Failure Modes
> **Failure: Stripe Webhook Signature Validation**
> **Symptom:** Webhook events return 400, payments not processed
> **Cause:** STRIPE_WEBHOOK_SECRET env var missing or wrong (from production incident)
> **Diagnosis:** 1. Check logs for "signature verification failed" 2. Compare env var with Stripe dashboard
> **Fix:** Update STRIPE_WEBHOOK_SECRET from Stripe dashboard → Webhooks → Signing secret
> **Prevention:** Added to deployment checklist, .env.example updated

## Extraction Targets

<target name="logging">
  Search: Logger initialization, logging config
  Files: **/logger.*, **/logging.*, src/lib/logger.*, config/*log*
  Extract: Library (winston, pino, logging), config location, log levels, format
  <if_not_found>Write: "console.log/print() — no structured logging. Recommend [pino/winston]."</if_not_found>
</target>

<target name="error_tracking">
  Search: Error tracking service initialization
  Files: Sentry.init, Bugsnag.start, Rollbar config in source files
  Extract: Service name, initialization location, DSN/key location
  <if_not_found>Write: "No error tracking detected — recommend Sentry for production"</if_not_found>
</target>

<target name="failure_modes">
  Search: User Q&A venting question response
  Files: Q&A log
  Extract: Structure each failure: symptom, cause, diagnosis, fix, prevention
  <if_not_found>Write: "Not yet documented — add failures as they occur via teach mode"</if_not_found>
</target>

<target name="observability">
  Search: APM and monitoring tools in dependencies
  Files: package.json for newrelic, datadog, prometheus
  Extract: Tools in use, dashboard locations
  <if_not_found>Write: "No APM detected — recommend adding for production scale"</if_not_found>
</target>

## Structure

- 5 H2 sections: Logging, Error Tracing, Common Failure Modes, Debugging Workflow, Observability
- Failure Modes: Each entry must have Symptom, Cause, Diagnosis, Fix (structured format)
- If venting question unanswered: Honest placeholder, not fabricated failures
- Target: 300-500 lines (early-stage: 50-200 acceptable)

## Citation Protocol

For failure modes from Q&A, structure the user's answer:
```
**Failure: [Name from user description]**
**Symptom:** [What user said breaks]
**Cause:** [User's stated cause or "Under investigation"]
```

For logging config, read and quote actual setup code.

## References

- Exploration results: `.ana/.setup_exploration.md`
- Q&A log: `.ana/.setup_qa_log.md` — venting question is key input
- Rules: `.ana/context/setup/rules.md`
