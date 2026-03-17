# Phase 17: Download Page & Sideload Instructions - Research

**Researched:** 2026-03-17
**Domain:** Next.js static page + Chrome extension sideload distribution
**Confidence:** HIGH

## Summary

Phase 17 adds a "Download" page to the existing Next.js web app so authenticated users can download the Chrome extension zip and follow sideloading instructions. This is a straightforward frontend-only phase -- no backend changes, no database changes, no new APIs. The extension zip already exists at `extension/dist/homematch-extension-0.4.0-chrome.zip` (208KB), and simply needs to be copied into `web/public/` and referenced from a new page.

The primary complexity is **UX, not technology**: creating clear sideloading instructions that guide non-technical users through enabling Developer Mode, navigating to `chrome://extensions`, and loading the unpacked extension. A key constraint is that `chrome://` URLs cannot be opened from web page links (browser security restriction) -- the instructions must tell users to copy/paste or type the URL manually.

**Primary recommendation:** Create a simple static page at `/download` inside the `(dashboard)` route group, add a "Download" nav item to the TopNavbar, copy the extension zip to `web/public/`, and build the instruction steps using existing UI components (Card, Button from shadcn/ui).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DL-01 | User sees "Download" item in the top navigation bar | TopNavbar component uses a simple `navItems` array -- add one entry with a Download/Chrome icon |
| DL-02 | User can download the Chrome extension as a zip file with one click | Place zip in `web/public/`, use an `<a href="/homematch-extension.zip" download>` link styled as a Button |
| DL-03 | User sees step-by-step installation instructions (unzip, chrome://extensions, Developer Mode, Load unpacked) | Static content using Card components, numbered steps with icons |
| DL-04 | Instructions link opens chrome://extensions in a new tab | CANNOT be implemented as a clickable link -- `chrome://` URLs are blocked by browsers from web pages. Must use a "copy to clipboard" button or display the URL as code for the user to paste manually |
| HOST-01 | Extension zip is served as a static file from the Next.js public/ directory | Copy `extension/dist/homematch-extension-0.4.0-chrome.zip` to `web/public/homematch-extension.zip` |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App framework, page routing, static file serving | Already the project framework |
| React | 19.2.3 | UI rendering | Already in project |
| lucide-react | 0.577.0 | Icons (Download, Chrome, Copy, Check, etc.) | Already used for all nav icons |
| shadcn/ui | 4.0.2 | Card, Button, Badge components | Already used throughout the app |
| Tailwind CSS | 4.x | Styling | Already in project |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | 0.7.1 | Button variants | For download button styling |
| tailwind-merge | 3.5.0 | Class merging | Standard utility |

### No New Dependencies Needed

This phase requires zero new npm packages. Everything needed is already in the project.

## Architecture Patterns

### Recommended Project Structure
```
web/
├── public/
│   └── homematch-extension.zip      # NEW: extension zip (copied from extension/dist/)
└── src/
    ├── app/
    │   └── (dashboard)/
    │       └── download/
    │           └── page.tsx          # NEW: download page
    ├── components/
    │   └── top-navbar.tsx            # MODIFIED: add Download nav item
    └── __tests__/
        ├── top-navbar.test.tsx       # MODIFIED: update nav order assertion
        └── download-page.test.tsx    # NEW: download page tests
```

### Pattern 1: Adding a Nav Item (established pattern)
**What:** The TopNavbar uses a declarative `navItems` array. Adding a nav item is a one-line addition.
**When to use:** For DL-01.
**Example:**
```typescript
// Source: web/src/components/top-navbar.tsx (existing pattern)
const navItems = [
  { title: "AI-Powered Search", url: "/ai-search", icon: Sparkles, accent: true },
  { title: "Profiles", url: "/profiles", icon: User },
  { title: "Analyses", url: "/analyses", icon: BarChart3 },
  { title: "Download", url: "/download", icon: Download },  // NEW
  { title: "Settings", url: "/settings", icon: Settings },
]
```

### Pattern 2: Static Page in Dashboard Route Group (established pattern)
**What:** Pages under `(dashboard)/` get auth protection, the top navbar, and the standard layout automatically.
**When to use:** For the download page -- it should be auth-protected per STATE.md decisions.
**Example:**
```typescript
// Source: web/src/app/(dashboard)/settings/page.tsx (existing pattern)
export default function DownloadPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* page content */}
    </div>
  )
}
```

### Pattern 3: Static File Download via HTML anchor
**What:** Next.js serves files from `public/` at the root URL path. A zip file at `public/homematch-extension.zip` is served at `/homematch-extension.zip`.
**When to use:** For DL-02 and HOST-01.
**Example:**
```tsx
<a href="/homematch-extension.zip" download>
  <Button size="lg">
    <Download className="mr-2 size-4" />
    Download Extension (.zip)
  </Button>
</a>
```

### Anti-Patterns to Avoid
- **Linking to chrome:// URLs:** Browsers block `<a href="chrome://extensions">` -- it silently fails. Do NOT attempt this. Use a copy-to-clipboard button or display the URL as inline code.
- **API route for download:** Unnecessary complexity. The zip is a static file -- serve it directly from `public/`. No need for a Route Handler.
- **Dynamic zip generation:** The zip is pre-built. No need to zip on-the-fly.
- **Storing the zip in git LFS:** At 208KB, the zip is small enough for regular git.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Download button | Custom fetch+blob download | `<a href download>` HTML attribute | Native browser download, works everywhere, zero JS needed |
| Copy to clipboard | Manual `document.execCommand` | `navigator.clipboard.writeText()` | Modern API, supported in all current browsers |
| Step numbering | Custom counter CSS | Tailwind + manual numbering or ordered list | Simpler, more readable |
| Instructions layout | Complex custom grid | shadcn Card components | Already available, consistent with app design |

**Key insight:** This entire phase is static content with one download link. Keep it simple -- no state management, no API calls, no dynamic data.

## Common Pitfalls

### Pitfall 1: chrome:// Links Don't Work from Web Pages
**What goes wrong:** Developer adds `<a href="chrome://extensions" target="_blank">` and it silently does nothing.
**Why it happens:** Browsers block navigation to `chrome://` URLs from web content for security reasons.
**How to avoid:** Display `chrome://extensions` as copyable text with a "Copy" button using `navigator.clipboard.writeText("chrome://extensions")`. Show a visual confirmation (checkmark) after copy.
**Warning signs:** The link renders but clicking does nothing -- no error in console, no navigation.

### Pitfall 2: Forgetting the `download` Attribute
**What goes wrong:** Browser opens the zip file inline or navigates to it instead of downloading.
**Why it happens:** Without the HTML `download` attribute, the browser decides what to do with the file based on MIME type.
**How to avoid:** Always use `<a href="/file.zip" download="homematch-extension.zip">` with both the `download` attribute and a filename.
**Warning signs:** Clicking "Download" navigates away from the page.

### Pitfall 3: Extension Zip Not in public/ at Build Time
**What goes wrong:** The download link returns 404 on Vercel.
**Why it happens:** Next.js only serves files that are in `public/` at build time. If the zip isn't committed to git and present in `web/public/`, Vercel won't serve it.
**How to avoid:** Copy the zip to `web/public/` and commit it to git before deploying.
**Warning signs:** Works locally with `next dev` but 404 on production.

### Pitfall 4: Existing Tests Break When Nav Order Changes
**What goes wrong:** The `top-navbar.test.tsx` test asserts a specific nav item order: `["AI-Powered Search", "Profiles", "Analyses", "Settings"]`. Adding "Download" will break this assertion.
**Why it happens:** Test uses exact array equality.
**How to avoid:** Update the test to include "Download" in the expected order.
**Warning signs:** CI/test failure after adding the nav item.

### Pitfall 5: Zip File Version Drift
**What goes wrong:** The zip in `web/public/` becomes stale as extension code changes.
**Why it happens:** The zip must be manually rebuilt and re-copied after extension changes.
**How to avoid:** Document the update process. For now (hackathon scope), a single copy is sufficient. Consider a build script later.
**Warning signs:** Users download an outdated extension version.

## Code Examples

### Download Page Structure
```tsx
// web/src/app/(dashboard)/download/page.tsx
import { Download, Chrome, Copy, Check, FolderOpen, ToggleRight, Puzzle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function DownloadPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Download Extension</h1>
        <p className="text-muted-foreground mt-1">
          Install the HomeMatch Chrome extension to score listings on Flatfox
        </p>
      </div>

      {/* Download button */}
      <div className="flex justify-center mb-10">
        <a href="/homematch-extension.zip" download="homematch-extension.zip">
          <Button size="lg">
            <Download className="mr-2 size-4" />
            Download HomeMatch Extension
          </Button>
        </a>
      </div>

      {/* Step-by-step instructions */}
      <div className="space-y-4">
        {/* Step 1: Unzip */}
        {/* Step 2: Open chrome://extensions */}
        {/* Step 3: Enable Developer Mode */}
        {/* Step 4: Load unpacked */}
      </div>
    </div>
  )
}
```

### Copy-to-Clipboard for chrome:// URL (Client Component)
```tsx
"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CopyExtensionsUrl() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText("chrome://extensions")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
        chrome://extensions
      </code>
      <Button variant="ghost" size="sm" onClick={handleCopy}>
        {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
      </Button>
    </div>
  )
}
```

### Updated TopNavbar
```typescript
// Add Download import and nav item
import { User, BarChart3, Settings, Sparkles, Download } from "lucide-react"

const navItems = [
  { title: "AI-Powered Search", url: "/ai-search", icon: Sparkles, accent: true },
  { title: "Profiles", url: "/profiles", icon: User },
  { title: "Analyses", url: "/analyses", icon: BarChart3 },
  { title: "Download", url: "/download", icon: Download },
  { title: "Settings", url: "/settings", icon: Settings },
]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `document.execCommand('copy')` | `navigator.clipboard.writeText()` | 2020+ | Modern, promise-based, all current browsers |
| Custom download JS (blob/URL.createObjectURL) | HTML `download` attribute on `<a>` | Always available | Zero JS needed for static files |
| Inline install API (`chrome.webstore.install()`) | Sideloading / Chrome Web Store only | Chrome 71 (2018) | Inline install deprecated; sideload or CWS are the only options |

**Deprecated/outdated:**
- `chrome.webstore.install()` inline install API -- removed in Chrome 71
- `document.execCommand('copy')` -- still works but deprecated in favor of Clipboard API

## Open Questions

1. **Nav item placement: before or after Settings?**
   - What we know: Current order is AI-Powered Search | Profiles | Analyses | Settings
   - What's unclear: Should Download go before Settings (as a "secondary action" nav item) or somewhere else?
   - Recommendation: Place it between Analyses and Settings -- it's a utility page like Settings, but more prominent for new users. The planner can adjust if the user has a preference.

2. **Should the page show the extension version number?**
   - What we know: Extension is currently v0.4.0
   - What's unclear: Whether to display version info to users
   - Recommendation: Show it as small muted text near the download button for transparency. Low effort, useful signal.

3. **Should the zip filename be versioned?**
   - What we know: Current zip is `homematch-extension-0.4.0-chrome.zip`
   - What's unclear: Whether to use a versioned or generic filename in `public/`
   - Recommendation: Use a generic name `homematch-extension.zip` in `public/` so the download URL never changes. Simpler for users and docs.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + React Testing Library 16.3.2 |
| Config file | `web/vitest.config.mts` |
| Quick run command | `cd web && npx vitest run src/__tests__/download-page.test.tsx src/__tests__/top-navbar.test.tsx` |
| Full suite command | `cd web && npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DL-01 | "Download" nav item visible in TopNavbar | unit | `cd web && npx vitest run src/__tests__/top-navbar.test.tsx -x` | Exists (needs update) |
| DL-02 | Download button links to zip with download attribute | unit | `cd web && npx vitest run src/__tests__/download-page.test.tsx -x` | Wave 0 |
| DL-03 | Step-by-step instructions rendered | unit | `cd web && npx vitest run src/__tests__/download-page.test.tsx -x` | Wave 0 |
| DL-04 | chrome://extensions URL displayed with copy functionality | unit | `cd web && npx vitest run src/__tests__/download-page.test.tsx -x` | Wave 0 |
| HOST-01 | Zip file exists in public/ directory | smoke | `test -f web/public/homematch-extension.zip && echo "OK"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd web && npx vitest run src/__tests__/download-page.test.tsx src/__tests__/top-navbar.test.tsx`
- **Per wave merge:** `cd web && npx vitest run`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] `web/src/__tests__/download-page.test.tsx` -- covers DL-02, DL-03, DL-04
- [ ] Update `web/src/__tests__/top-navbar.test.tsx` -- update nav order assertion to include "Download"
- [ ] Copy `extension/dist/homematch-extension-0.4.0-chrome.zip` to `web/public/homematch-extension.zip`

## Sources

### Primary (HIGH confidence)
- **Project codebase** -- direct inspection of `web/src/components/top-navbar.tsx`, `web/src/app/(dashboard)/layout.tsx`, `web/src/app/(dashboard)/settings/page.tsx`, `web/vitest.config.mts`, `extension/package.json`, `extension/wxt.config.ts`
- [Next.js public folder docs](https://nextjs.org/docs/pages/api-reference/file-conventions/public-folder) -- static file serving from `public/`
- [Vercel limits](https://vercel.com/docs/limits) -- no per-file size restriction for static assets; 208KB zip is well within bounds

### Secondary (MEDIUM confidence)
- [Chrome extension sideloading instructions](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions) -- official Chrome docs on alternative distribution
- [Lucide icons](https://lucide.dev/icons/) -- Download, Chrome, Copy, Check, FolderOpen icons confirmed available

### Tertiary (LOW confidence)
- None -- all findings verified against project code or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, everything already in the project
- Architecture: HIGH -- follows exact patterns established in phases 8-16 (TopNavbar, dashboard layout, page structure)
- Pitfalls: HIGH -- chrome:// link limitation is well-documented; other pitfalls observed directly in codebase (test assertions)

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable -- no fast-moving dependencies)
