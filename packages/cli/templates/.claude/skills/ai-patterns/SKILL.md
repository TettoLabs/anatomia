---
name: ai-patterns
description: "Invoke when working with LLM integrations, prompt management, streaming responses, or AI-related error handling. Contains project-specific AI SDK patterns and conventions."
---

# AI Patterns

## Detected
<!-- Populated by scan during init. Do not edit manually. -->

## Rules

- All LLM calls through a centralized wrapper — never call the SDK directly from route handlers or UI components.
- Handle LLM errors explicitly: timeout, rate limit, invalid response, and token limit exceeded. Each needs a distinct handling path.
- Use streaming for user-facing responses when latency matters. Batch for background processing.
- Use structured output (JSON mode or tool use) for data extraction — never regex-parse natural language responses.
- Centralize prompt management — prompts live in dedicated files or functions, not inline in business logic.
- Track model and token usage per request for cost visibility.
- Test AI features with deterministic inputs and snapshot expected outputs. Don't assert on LLM creativity — assert on structure, format, and constraint adherence.

## Gotchas
<!-- Starts empty. Add failure modes as you discover them. -->

## Examples
<!-- Optional. Add short snippets showing the RIGHT way. -->
