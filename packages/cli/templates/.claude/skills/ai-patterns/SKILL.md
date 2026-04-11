---
name: ai-patterns
description: "Invoke when working with LLM integrations, prompt management, streaming responses, or AI-related error handling. Contains project-specific AI SDK patterns and conventions."
---

# AI Patterns

## Detected
<!-- Populated by scan during init. Do not edit manually. -->

## Rules

- All LLM calls through a centralized wrapper — never call the SDK directly from route handlers or UI components.
- Handle LLM errors explicitly by class — timeout, network/connectivity, rate limit, context-length exceeded, content policy refusal, malformed response, authentication failure. Each needs a distinct handling path; don't collapse them into a single "AI error" branch.
- Retry transient failures (timeout, network, rate limit, server errors) with exponential backoff and jitter. Do not blindly retry logical errors (content policy, context overflow, auth). Cap retries at 3 and be mindful of per-request cost — retrying large-context calls multiplies spend significantly.
- Use streaming for user-facing responses when latency matters. Batch for background processing.
- Use structured output (JSON mode or tool use) for data extraction — never regex-parse natural language responses.
- Centralize prompt management — prompts live in dedicated files or functions, not inline in business logic.
- Track model and token usage per request for cost visibility.
- Test AI features with deterministic inputs and snapshot expected outputs. Don't assert on LLM creativity — assert on structure, format, and constraint adherence.

## Gotchas
*Not yet captured. Add as you discover them during development.*

## Examples
*Not yet captured. Add short snippets showing the RIGHT way.*
