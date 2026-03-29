---
status: testing
phase: 20-landing-page-redesign
source: [20-01-SUMMARY.md]
started: 2026-03-27T00:00:00Z
updated: 2026-03-27T00:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Chapter 1 — Hook load animation
expected: |
  On page load, the words "Your next home. Already found." stagger-fade up one by one.
  The HomeMatch logo fades in ~1.2s after load. A scroll indicator appears ~2s in.
awaiting: user response

## Tests

### 1. Chapter 1 — Hook load animation
expected: On page load, the words "Your next home. Already found." stagger-fade up one by one. HomeMatch logo fades in ~1.2s after load. A scroll indicator appears ~2s in.
result: [pending]

### 2. Chapter 2 — Globe zoom to Switzerland
expected: As you scroll into Chapter 2, an SVG globe zooms in (scale 1→5) and pans to keep Switzerland centered. The Switzerland polygon turns teal. Copy lines fade up below.
result: [pending]

### 3. Chapter 3 — Isometric house build
expected: Scrolling through Chapter 3 builds an isometric house piece by piece (foundation → walls → roof → windows → door → chimney). After it fully builds, it dims and 3 pain-point lines appear on the right.
result: [pending]

### 4. Chapter 4 — Browser mechanism zoom
expected: Chapter 4 shows a browser mockup with 3 listing cards. Score badges (e.g. 87) pop onto each card. Then the browser zooms in to the highest-score card only, and a match analysis breakdown panel slides in from the right.
result: [pending]

### 5. Chapter 5 — Score reveal
expected: "87." appears in large teal text, followed by "Excellent match." Then 3 category bars (Location 92%, Size 88%, Price 75%) animate from 0% to their target widths.
result: [pending]

### 6. Chapter 6 — Dream glow
expected: The isometric house reappears on a light background. As you scroll, warm amber window glows fade in and 3 dream copy lines stagger up from below.
result: [pending]

### 7. Chapter 7 — CTA
expected: A final dark section fades in with the HomeMatch logo, a headline, and a prominent CTA button. Clicking the button navigates to /auth (the sign-in page).
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0

## Gaps

[none yet]
