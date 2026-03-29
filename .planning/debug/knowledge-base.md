# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## background-image-not-displaying — Background image missing from web app despite file existing locally
- **Date:** 2026-03-29
- **Error patterns:** background image, not displaying, webp, missing, public, zurich
- **Root cause:** web/public/zurich_bg_grossmuenster.webp was added to the local filesystem but never committed to git. Vercel deploys from git so the file is absent in production.
- **Fix:** Committed web/public/zurich_bg_grossmuenster.webp to git and pushed to main, triggering a Vercel redeploy.
- **Files changed:** web/public/zurich_bg_grossmuenster.webp
---

