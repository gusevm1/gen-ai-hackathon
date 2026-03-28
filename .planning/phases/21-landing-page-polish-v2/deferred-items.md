# Deferred Items — Phase 21 Landing Page Polish v2

## Pre-existing Test Failures (out of scope for 21-01)

### section-solution.test.tsx: renders features overline + renders feature 1 title

**Discovered during:** Task 2 (21-01)
**Status:** Pre-existing failures — NOT caused by Task 2 changes
**Root cause:** `web/src/components/landing/SectionSolution.tsx` has an uncommitted rewrite (Phase 20 work in progress) that removed the Features section block. The committed version has `landing_feat1_title` → "AI match scoring" and `landing_features_overline` → "Built for Swiss renters", but the working tree version omits these.
**Action needed:** Either commit the new `SectionSolution.tsx` that includes a features block, or update the tests to remove the features assertions. This should be addressed in a later plan when `SectionSolution.tsx` is formally committed.
**Tests affected:**
- `src/__tests__/section-solution.test.tsx > SectionSolution > renders features overline`
- `src/__tests__/section-solution.test.tsx > SectionSolution > renders feature 1 title`
