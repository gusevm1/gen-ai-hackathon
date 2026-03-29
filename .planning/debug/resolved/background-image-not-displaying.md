---
status: resolved
trigger: "Background photos are not being displayed in the web app. The image web/public/zurich_bg_grossmuenster.webp exists but is not showing."
created: 2026-03-29T00:00:00Z
updated: 2026-03-29T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — image file exists locally but was never committed to git
test: git status web/public/zurich_bg_grossmuenster.webp
expecting: Vercel deploys from git, so untracked file means it doesn't exist in production
next_action: Commit web/public/zurich_bg_grossmuenster.webp to git and push

## Symptoms

expected: Background image (zurich_bg_grossmuenster.webp) should be visible in the web app UI
actual: Background photos are not being displayed at all
errors: None mentioned
reproduction: Visit the web app — background image is missing
started: Was supposedly implemented already but not working

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-03-29T00:00:00Z
  checked: web/public directory listing
  found: zurich_bg_grossmuenster.webp exists alongside zurich-bg.jpg and zurich-sunset-bg.jpg
  implication: Image file is present locally; issue is in whether it was committed

- timestamp: 2026-03-29T00:01:00Z
  checked: git status web/public/zurich_bg_grossmuenster.webp
  found: File is untracked — never committed to git
  implication: Vercel auto-deploys from git. Untracked file means production has no such file. That is why the image is missing.

- timestamp: 2026-03-29T00:02:00Z
  checked: Component code in auth/page.tsx, SectionCredits.tsx, SectionHero.tsx, LandingPageContent.tsx
  found: All code references are correct. Path /zurich_bg_grossmuenster.webp is correct for Next.js public serving. No conditional logic hiding the image.
  implication: The only missing piece is the file in the git repository.

## Resolution

root_cause: web/public/zurich_bg_grossmuenster.webp was added to the local filesystem but never committed to git. Vercel deploys from git so the file is absent in production.
fix: Commit web/public/zurich_bg_grossmuenster.webp to git and push to main, triggering a Vercel redeploy.
verification: After push, visit the web app and confirm background images appear on the auth page and SectionCredits landing section.
files_changed: [web/public/zurich_bg_grossmuenster.webp]
