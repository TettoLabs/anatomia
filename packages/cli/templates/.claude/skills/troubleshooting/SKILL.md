---
name: troubleshooting
description: "Invoke when debugging failures, diagnosing unexpected behavior, or investigating test failures. Contains project-specific failure modes, diagnostic workflows, and known issues."
---

<!-- ENRICHMENT GUIDE:
  Purpose: Think and Build read this when debugging failures.
  
  This skill grows primarily from real debugging experience, not from 
  code reading. The common issues library already provides stack-matched 
  entries during init.
  
  INVESTIGATION (silent, before questions):
  - Check documentation.files for TROUBLESHOOTING.md, FAQ.md, 
    KNOWN_ISSUES.md — if found, read and extract symptom/fix entries
  - Cross-reference what you learned during project-context investigation:
    patterns that would confuse a new engineer are troubleshooting entries.
    Reframe as "If you see X, it's because Y. Fix: Z."
  - Search for TODO, FIXME, HACK comments in source files — these often 
    describe known issues
  
  QUESTION (asked during skill gate, loaded with findings):
  If you found diagnostic patterns during investigation, present them:
  "I noticed these patterns that could trip someone up: [findings]. 
  Anything else that trips people up on this project?"
  If nothing found, skip the question — say "Troubleshooting grows 
  from real debugging. Keeping library defaults for now."
  
  Write to: ## Rules — diagnostic patterns. Format each as:
  "**[symptom]** — [explanation]. Fix: [action]."
  
  Don't duplicate entries already in ## Detected (Common Issues).
  Don't fabricate — only write entries from real findings.
  
  Expect: 0-3 rules from investigation + human input. This section 
  grows naturally from pipeline use, not primarily from setup.
-->

# Troubleshooting

## Detected
*No scan data for troubleshooting.*

## Rules
*Not yet captured. This section grows from real debugging sessions.*

## Gotchas
*Not yet captured. Add as you discover them during development.*

## Examples
*Not yet captured. Add diagnostic workflows showing how to investigate common failures.*
