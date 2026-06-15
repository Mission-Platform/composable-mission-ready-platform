---
'@mission-platform/components': patch
---

test(components): add WCAG AAA accessibility test harness and suite

Add an `axe-core`-based accessibility testing harness for the component library:

- New `src/test-utils/axe.ts` helper exporting `runAxe`, `expectNoA11yViolations`, `summarizeViolations`, and `mountForA11y`. It scopes axe-core to a mounted component's root element and runs the WCAG 2.0/2.1/2.2 A, AA, and AAA rule sets, so failures report the offending rule ids, impact, help text, and DOM targets. (Under jsdom, axe's colour-contrast rules are reported as *incomplete* rather than violations — the design tokens are independently verified at AAA contrast — so these tests cover the *structural* AAA requirements: roles, names, relationships, landmarks, and ARIA usage.)
- New cross-component `src/components/accessibility.spec.ts` suite auditing a representative cross-section of components (button, badge, typography, input, checkbox, radio group, field set, rating, location input, alert banner, breadcrumb).
- Lock-in regression tests for the two recent a11y fixes: `BaseRating` now asserts it exposes no nested interactive controls, and a new `BaseLocationInput` spec asserts the disabled legend keeps its full-contrast primary colour.
- Adds `axe-core` as a dev dependency.
