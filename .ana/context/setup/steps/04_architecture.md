# Step 4: Write architecture.md

## Goal

Document WHY the project is designed this way — not just WHAT the design is. Architecture rationale often requires user input because it captures design intent that's not visible in code. For projects without intentional architecture, infer from observable structure and be honest about gaps.

## Quality Checklist

Before finishing, verify:
- [ ] Architecture pattern identified with confidence score
- [ ] Rationale documented (from user Q&A) or marked "Not yet documented"
- [ ] System boundaries show internal components and external services
- [ ] Design decisions include context and trade-offs when available
- [ ] No speculation — facts, user quotes, or honest "undocumented" markers
- [ ] All 4 sections present: Architecture Pattern, System Boundaries, Design Decisions, Trade-Offs

## Example

**BAD (assertion without reasoning):**
> ## Architecture Pattern
> Uses layered architecture. The API layer calls the service layer which calls the repository layer.

**GOOD (decision with context):**
> ## Architecture Pattern
> **Type:** Layered (api/ → services/ → repositories/) — confidence 0.89
> **User stated:** "Layered for testability. Team of 3 can't maintain microservices overhead."
> **Trade-off:** 3 files per feature vs 1 (worth it for test isolation)
> **Enforced by:** Import linting — services/ cannot import from api/

## Extraction Targets

<target name="architecture_pattern">
  Search: Directory organization, layer separation, module boundaries
  Files: Top-level directories, import patterns between directories
  Extract: Pattern type (layered, modular, flat), layer flow, boundary enforcement
  <if_not_found>Write: "Flat structure — no explicit architecture pattern"</if_not_found>
</target>

<target name="system_boundaries">
  Search: External service integrations, API clients, third-party dependencies
  Files: package.json dependencies, config files for external services
  Extract: Internal components list, external services (Stripe, Supabase, etc.), data stores
  <if_not_found>Write: "No external services detected"</if_not_found>
</target>

<target name="design_decisions">
  Search: ADR files, ARCHITECTURE.md, decision comments in code
  Files: docs/adr/*, ARCHITECTURE.md, DECISIONS.md
  Extract: Documented decisions with context and rationale
  <if_not_found>Write: "From user Q&A or mark as 'Not yet documented'"</if_not_found>
</target>

<target name="trade_offs">
  Search: User Q&A responses about what was optimized for
  Files: Q&A log
  Extract: What was prioritized, what was sacrificed, why acceptable
  <if_not_found>Write: "Not yet documented — add via teach mode"</if_not_found>
</target>

## Structure

- 4 H2 sections: Architecture Pattern, System Boundaries, Design Decisions, Trade-Offs
- Architecture Pattern: type, how it works in this project, alternatives considered
- System Boundaries: internal components, external services, data stores
- Design Decisions: ADR-lite format if user provided rationale, else honest gap
- Trade-Offs: what optimized for, what gave up, why acceptable
- Target: 300-500 lines (minimal projects: 50-300 acceptable)

## Citation Protocol

Quote user answers exactly when documenting rationale. Use format:
```
**User stated:** "Layered for testability. Team of 3."
```

Never speculate on rationale. If unknown, write "Not yet documented."

## References

- Exploration results: `.ana/.setup_exploration.md`
- Q&A log: `.ana/.setup_qa_log.md`
- Rules: `.ana/context/setup/rules.md`
