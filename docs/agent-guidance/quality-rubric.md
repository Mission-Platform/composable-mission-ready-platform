# Agent Work Quality Rubric

Use this rubric before implementation to choose an approach and during review to assess the result. Apply every dimension that fits the task; a documentation-only change still needs to be simple, maintainable, readable, and hygienic. Record concrete evidence for material trade-offs rather than treating the rubric as a subjective score.

## Smallest Safe Change

- State the requested outcome and the smallest change that can satisfy it.
- Prefer existing repository patterns, packages, tools, profiles, and documentation over new abstractions.
- Keep unrelated cleanup, speculative redesign, and unapproved MCP runtime changes out of the task.
- Expand scope only when evidence shows the smaller approach cannot preserve correctness, security, or required validation.

## Seven Dimensions

### Simplicity

- Does the solution use the fewest files, moving parts, dependencies, state transitions, and tool calls that satisfy the requirement?
- Does it reuse an existing component, utility, token, translation, workflow, or MCP capability instead of duplicating one?
- Have speculative abstractions, duplicate MCP tools, and unnecessary configuration changes been removed?

### Complexity

- Identify new dependencies, state, control flow, cross-package edges, profile/tool surface, operational steps, and failure modes.
- Explain why each unavoidable source of complexity is required and why a simpler alternative is insufficient.
- Keep complexity local to the owning package or topic document and avoid spreading policy across duplicate sources.

### Reliability

- Define observable expected behavior and the evidence that will demonstrate it.
- Prefer deterministic behavior, bounded operations, explicit failure handling, and safe fallbacks.
- Validate the paths that matter, including negative cases and integration boundaries; do not treat a partial fixture, source diagnostic, or isolated unit as proof of end-to-end behavior.
- Report failures, uncertainty, and unverified assumptions instead of silently inferring success.

### Maintainability

- Follow repository conventions for structure, naming, dependencies, tests, documentation, and ownership.
- Keep responsibilities local and give each rule one canonical documentation home.
- Document durable decisions and non-obvious constraints where a future agent will find them.
- Avoid stale links, duplicated inventories, parallel implementations, and wording that can drift from the source of truth.

### Security

- Preserve least privilege, repository root and path bounds, shell-free execution, explicit mutation approval, and secret hygiene.
- Defend against injection, use approved cryptography and dependency practices, and preserve dependency direction.
- Do not weaken existing security scans or replace bounded/read-only inspection with broader access for convenience.
- For applicable changes, run the relevant developer-MCP security checks: `security_scan_secrets`, `security_analyze_code`, `security_audit_dependencies`, `security_audit_supply_chain`, `security_collect_compliance_evidence`, and `security_audit_compliance`.

### Hygiene

- Keep the diff focused and preserve repository formatting, naming, and workflow conventions.
- Remove temporary artifacts created during the task without deleting pre-existing or session-managed files.
- Update affected documentation and links, and verify that no generated, local, secret, or unrelated files were included.
- Report the exact validation performed and any checks that could not run.

### Readability & Comprehension

- Use a clear heading hierarchy, short sections, consistent terminology, and direct sentences so the intended agent can scan the guidance quickly.
- Minimize cognitive load: present prerequisites before actions, keep related rules together, identify mandatory versus optional work, and avoid unexplained cross-references.
- Explain non-obvious constraints, ownership, precedence, safety boundaries, and the reason for an unusual validation requirement.
- Check that links, examples, names, and output descriptions are understandable without hidden session context.
- Perform an independent comprehension pass: could another agent follow the guidance and choose the correct next action from the document alone?

## Review Record

For a non-trivial task, summarize the rubric findings in the final review or handoff. Mention the smallest safe approach, material complexity, evidence of reliability, security and hygiene checks, and any readability issue that should become separately authorized follow-up work.

Related policy: [Repository safety and validation](repository-safety-and-validation.md) and [Session self-review](session-self-review.md).