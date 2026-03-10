# Phase 1: Infrastructure & Auth - Research

**Researched:** 2026-03-10
**Domain:** Full-stack scaffolding (Next.js + FastAPI + WXT Chrome Extension + Supabase)
**Confidence:** HIGH

## Summary

Phase 1 is primarily a scaffolding and wiring phase. All four codebases (Next.js web app, FastAPI backend, WXT Chrome extension, Supabase project) are greenfield and can be scaffolded in parallel. The critical convergence point is wiring Supabase auth across the web app and extension, plus creating an edge function that proxies to the EC2 backend.

The standard stack is well-documented and mature: Next.js App Router with `@supabase/ssr` for cookie-based server-side auth, WXT with React for the Chrome extension, FastAPI with Docker/uvicorn for the backend, and Supabase for auth + PostgreSQL + edge functions. The trickiest integration point is Supabase auth in the Chrome extension, which requires a custom `chrome.storage.local` adapter since Manifest V3 service workers lack `localStorage`.

**Primary recommendation:** Use Supabase's official Next.js SSR patterns (`@supabase/ssr` with middleware for token refresh), a custom Chrome storage adapter for the extension, and keep the FastAPI backend minimal (health check + CORS only in Phase 1). Create database tables via Supabase SQL editor or migrations with RLS from day 1.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Archive existing `extension/` directory to `.planning/archive/extension-homegate/` for reference
- Scaffold a fresh WXT extension from scratch with pnpm + shadcn/ui + Tailwind CSS
- All three entrypoints scaffolded: popup, background worker, content script
- Keep `extension/` at repo root (not monorepo `packages/` structure)
- Repository layout: `extension/`, `web/`, `backend/` at repo root, no monorepo tooling
- Next.js App Router (not Pages Router)
- Landing page: centered login/signup form only -- no product pitch, no branding beyond minimal
- After login: empty dashboard shell showing user email, logout button, placeholder for preferences
- Single profile per user
- "Minimal UI, functionality first"
- Extension popup logged out: inline email/password login form directly in popup (no redirect to website)
- Extension popup logged in: user email + logout button + "Open HomeMatch" link to Next.js site
- Content script activates on flatfox.ch only (not all sites)
- Content script is scaffold only in Phase 1 -- no visible output
- Single JSONB column for user preferences (validated by Zod on frontend/backend)
- Separate analyses table for stored scores (user_id, listing_id, score, breakdown, created_at)
- All tables created in Phase 1
- Row-Level Security (RLS) enabled from day 1
- Supabase: CLI + account need to be set up (no existing setup)
- AWS CLI already configured
- Vercel CLI already configured
- EC2 backend deployed via Docker

### Claude's Discretion
- Exact Supabase table column definitions and types
- Docker configuration for FastAPI deployment
- Supabase edge function implementation details
- Next.js project configuration (ESLint, TypeScript settings)
- Extension manifest permissions and icon assets
- Auth error handling and loading states

### Deferred Ideas (OUT OF SCOPE)
- Multi-profile support (user mentioned wanting profile selection) -- future milestone per PROJECT.md
- Product pitch / branded landing page -- can be added later, functionality first
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up and log in on the Next.js website via Supabase (email/password) | Next.js + @supabase/ssr cookie-based auth with middleware, server actions for login/signup |
| AUTH-02 | User can log in via the Chrome extension popup using the same Supabase credentials | Custom chrome.storage.local adapter for Supabase client, signInWithPassword in popup |
| AUTH-03 | Supabase edge functions proxy scoring requests to EC2 backend with auth validation | Deno edge function with JWT verification via jose library, fetch to EC2 |
| INFRA-01 | Next.js app deployed on Vercel | create-next-app with App Router, Vercel auto-deploys from git |
| INFRA-02 | FastAPI backend deployed on EC2 via Docker | Python 3.12-slim base image, uvicorn, health check endpoint, CORS middleware |
| INFRA-03 | Supabase project configured with auth, database tables, and edge functions | supabase init + link, SQL migrations for tables with RLS, edge function deploy |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x (latest) | Web app framework | App Router is stable, Vercel-native deployment |
| @supabase/ssr | 0.5.x+ | SSR auth for Next.js | Official replacement for deprecated @supabase/auth-helpers |
| @supabase/supabase-js | 2.x | Supabase client (browser + extension) | Official client for auth, DB, edge functions |
| WXT | 0.20.x | Chrome extension framework | File-based entrypoints, Vite-powered, best MV3 DX |
| @wxt-dev/module-react | 1.x | React support for WXT | Official module for React in WXT |
| FastAPI | 0.115.x+ | Python backend framework | Fast, typed, OpenAPI auto-docs |
| uvicorn | 0.34.x+ | ASGI server for FastAPI | Standard production server for FastAPI |
| React | 19.x | UI framework | Already used in existing extension code |
| Tailwind CSS | 3.4.x | Utility-first CSS | Already established in project |
| shadcn/ui | latest | Component library | Already configured in existing extension, reuse in Next.js |
| Zod | 4.x | Schema validation | Already used in project for preference schemas |
| pnpm | latest | Package manager | Already established in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | 0.7.x | Component variant styling | Used by shadcn/ui components |
| clsx + tailwind-merge | latest | Class name composition | Used by shadcn/ui cn() utility |
| lucide-react | latest | Icon library | Consistent icons across web + extension |
| Vitest | 4.x | Test framework | Already configured in extension |
| happy-dom | latest | DOM environment for tests | Already configured as Vitest environment |
| jose | 6.x (jsr) | JWT verification in edge functions | Used in Deno edge function for auth validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | @supabase/auth-helpers | auth-helpers is DEPRECATED -- do not use |
| WXT | Plasmo | WXT has better React DX, already used in project |
| shadcn/ui | Radix primitives directly | shadcn/ui is already configured, provides styled defaults |
| pnpm | npm/yarn | pnpm already established, faster installs |

**Installation (Next.js web app):**
```bash
pnpm create next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd web && pnpm add @supabase/supabase-js @supabase/ssr
```

**Installation (Extension -- fresh scaffold):**
```bash
pnpm dlx wxt@latest init extension --template react
cd extension && pnpm add @supabase/supabase-js
```

**Installation (FastAPI backend):**
```bash
pip install fastapi uvicorn[standard]
```

## Architecture Patterns

### Recommended Project Structure
```
/
+-- extension/                  # WXT Chrome extension (fresh scaffold)
|   +-- src/
|   |   +-- entrypoints/
|   |   |   +-- popup/         # Popup with login form (index.html, App.tsx, main.tsx)
|   |   |   +-- background.ts  # Service worker -- Supabase client host
|   |   |   +-- content.ts     # Content script for flatfox.ch (scaffold only)
|   |   +-- components/
|   |   |   +-- ui/            # shadcn/ui components
|   |   |   +-- popup/         # Popup-specific components (LoginForm, Dashboard)
|   |   +-- lib/
|   |   |   +-- supabase.ts    # Supabase client with chrome.storage adapter
|   |   |   +-- utils.ts       # cn() utility
|   |   +-- assets/styles/
|   |   |   +-- globals.css    # Tailwind directives + shadcn CSS variables
|   |   +-- public/            # Extension icons
|   +-- wxt.config.ts
|   +-- tailwind.config.js
|   +-- package.json
|
+-- web/                        # Next.js App Router
|   +-- src/
|   |   +-- app/
|   |   |   +-- layout.tsx     # Root layout
|   |   |   +-- page.tsx       # Landing page (login/signup form)
|   |   |   +-- login/
|   |   |   |   +-- page.tsx   # Login page (or combined on landing)
|   |   |   |   +-- actions.ts # Server actions for signIn/signUp
|   |   |   +-- dashboard/
|   |   |       +-- page.tsx   # Protected dashboard shell
|   |   +-- lib/
|   |   |   +-- supabase/
|   |   |       +-- client.ts  # Browser client (createBrowserClient)
|   |   |       +-- server.ts  # Server client (createServerClient + cookies)
|   |   |       +-- middleware.ts # updateSession helper
|   |   +-- components/
|   |       +-- ui/            # shadcn/ui components
|   +-- middleware.ts           # Root middleware calling updateSession
|   +-- .env.local             # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
|
+-- backend/                    # FastAPI Python backend
|   +-- app/
|   |   +-- main.py            # FastAPI app with health check + CORS
|   |   +-- __init__.py
|   +-- requirements.txt       # fastapi, uvicorn
|   +-- Dockerfile
|   +-- .env                   # Backend secrets (not committed)
|
+-- supabase/                   # Supabase CLI project (created by supabase init)
|   +-- functions/
|   |   +-- score-proxy/       # Edge function to proxy to EC2
|   |       +-- index.ts
|   +-- migrations/
|   |   +-- 001_initial_schema.sql  # Tables + RLS policies
|   +-- config.toml
```

### Pattern 1: Next.js Supabase SSR Auth (Cookie-Based)
**What:** Server-side auth with cookie persistence via `@supabase/ssr`
**When to use:** All Next.js pages that need auth state
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client

// lib/supabase/client.ts -- Browser client
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

// lib/supabase/server.ts -- Server client
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {
            // Server Component context -- middleware handles persistence
          }
        },
      },
    }
  )
}

// lib/supabase/middleware.ts -- Session refresh
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
  await supabase.auth.getUser()
  return response
}

// middleware.ts (root)
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 2: Chrome Extension Supabase Auth (Custom Storage Adapter)
**What:** Supabase client in extension using chrome.storage.local instead of localStorage
**When to use:** Extension popup and background script
**Example:**
```typescript
// Source: https://github.com/orgs/supabase/discussions/21923 + community patterns

// lib/supabase.ts -- Extension Supabase client
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Custom storage adapter for chrome.storage.local
const chromeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(key)
    return result[key] ?? null
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await chrome.storage.local.set({ [key]: value })
  },
  removeItem: async (key: string): Promise<void> => {
    await chrome.storage.local.remove(key)
  },
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

### Pattern 3: Supabase Edge Function as Auth Proxy
**What:** Deno edge function that verifies JWT and proxies to EC2 backend
**When to use:** All requests from extension/web to EC2 backend
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/functions/auth

// supabase/functions/score-proxy/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2'

const EC2_BACKEND_URL = Deno.env.get('EC2_BACKEND_URL')!

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  // Verify auth
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return Response.json({ error: 'Missing auth' }, { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return Response.json({ error: 'Invalid token' }, { status: 401 })
  }

  // Proxy to EC2 backend
  const body = await req.json()
  const backendResponse = await fetch(`${EC2_BACKEND_URL}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, user_id: user.id }),
  })

  const data = await backendResponse.json()
  return Response.json(data, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
})
```

### Pattern 4: FastAPI Health Check + CORS
**What:** Minimal FastAPI setup for Phase 1
**When to use:** EC2 backend
**Example:**
```python
# Source: FastAPI official docs + Docker best practices

# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="HomeMatch API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "homematch-api"}
```

### Pattern 5: WXT Entrypoint Definitions
**What:** Convention-based entrypoint structure
**When to use:** All extension entrypoints
**Example:**
```typescript
// Source: https://wxt.dev/guide/essentials/entrypoints.html

// entrypoints/background.ts
export default defineBackground(() => {
  console.log('HomeMatch background loaded')
  // Future: handle messaging between popup and content script
})

// entrypoints/content.ts
export default defineContentScript({
  matches: ['*://*.flatfox.ch/*'],
  main(ctx) {
    console.log('HomeMatch content script loaded on Flatfox')
    // Phase 1: scaffold only, no visible output
  },
})
```

### Anti-Patterns to Avoid
- **Using @supabase/auth-helpers:** DEPRECATED. Use @supabase/ssr instead.
- **Trusting getSession() on server:** Always use `getUser()` for server-side auth validation -- it actually verifies the JWT with Supabase auth server.
- **Using localStorage in extension background:** MV3 service workers do not have localStorage. Must use chrome.storage.local adapter.
- **Hardcoding Supabase URL/key in extension source:** Use WXT environment variables via `import.meta.env.VITE_*` (WXT uses Vite).
- **Creating Supabase tables without RLS:** Always enable RLS immediately. Tables without RLS are publicly accessible via the anon key.
- **Async main() in defineBackground:** WXT explicitly states background main() CANNOT be async.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth token refresh | Manual token refresh logic | @supabase/ssr middleware + autoRefreshToken | Race conditions, token expiry edge cases |
| Cookie-based sessions in Next.js | Manual cookie management | @supabase/ssr createServerClient | Handles chunking large JWTs across cookies |
| Extension session persistence | Manual chrome.storage wiring | Supabase client with custom storage adapter | Handles token refresh, expiry, session lifecycle |
| CORS in FastAPI | Manual header injection | FastAPI CORSMiddleware | Handles preflight, credentials, methods correctly |
| JWT verification in edge functions | Manual token parsing | supabase.auth.getUser() with service role | Verifies against auth server, handles key rotation |
| Component styling | Custom CSS | shadcn/ui + Tailwind | Already configured, consistent across web + extension |

**Key insight:** Auth flows have enormous surface area for bugs (token refresh timing, cookie chunking, storage adapter edge cases). Using the official libraries is critical for a hackathon timeline.

## Common Pitfalls

### Pitfall 1: Extension Auth Session Desync
**What goes wrong:** Extension popup and background script have separate Supabase client instances with separate sessions. Login in popup does not propagate to background.
**Why it happens:** Each context (popup, background, content script) can create its own Supabase client instance.
**How to avoid:** Use a single Supabase client shared via the chrome.storage.local adapter. The adapter ensures all contexts read/write the same session tokens. Alternatively, centralize auth operations in the background script and use message passing.
**Warning signs:** User appears logged in on popup but API calls from content script fail with 401.

### Pitfall 2: Supabase Email Confirmation Blocking Login
**What goes wrong:** After signup, user cannot log in because email confirmation is required.
**Why it happens:** Supabase hosted projects have email confirmation enabled by default. The built-in SMTP is rate-limited to 2 emails/hour.
**How to avoid:** For hackathon development, disable "Confirm email" in Supabase dashboard (Auth > Providers > Email > toggle off). Or configure a custom SMTP provider.
**Warning signs:** signUp succeeds but signInWithPassword immediately fails.

### Pitfall 3: Next.js Server Component Cookie Write Error
**What goes wrong:** Auth state not persisting, or errors about cookies being read-only.
**Why it happens:** Server Components in Next.js App Router cannot write cookies. Only middleware and Route Handlers can.
**How to avoid:** The `createServerClient` in server.ts wraps `setAll` in a try/catch (which silently fails in Server Components). The middleware then handles the actual cookie writes.
**Warning signs:** User appears logged out on page refresh despite successful login.

### Pitfall 4: Missing RLS Policies After Table Creation
**What goes wrong:** Users can read/write all rows in the table, or no rows at all.
**Why it happens:** RLS is enabled but no policies are defined (blocks all access), or RLS is not enabled (allows all access via anon key).
**How to avoid:** Always create policies in the same migration as the table. Minimum: SELECT, INSERT, UPDATE, DELETE policies using `auth.uid() = user_id`.
**Warning signs:** 403 errors from Supabase client, or seeing other users' data.

### Pitfall 5: Edge Function JWT Verification Confusion
**What goes wrong:** Edge function accepts invalid tokens or rejects valid ones.
**Why it happens:** Supabase edge functions no longer implicitly verify JWTs. You must explicitly verify using supabase.auth.getUser() or jose library.
**How to avoid:** Always call `supabase.auth.getUser()` in the edge function with the auth header passed through. This verifies the token against the auth server.
**Warning signs:** Edge function works without auth header, or returns 500 on valid tokens.

### Pitfall 6: WXT Build-Time Code in Background Script
**What goes wrong:** Build errors or runtime errors in background script.
**Why it happens:** WXT imports background.ts during build in a Node.js environment. Any runtime code (chrome API calls, DOM access) outside the `main()` function causes errors.
**How to avoid:** All runtime code must be inside the `main()` function of `defineBackground()`.
**Warning signs:** Build fails with "chrome is not defined" or similar Node.js errors.

## Code Examples

### Database Schema (Supabase SQL Migration)
```sql
-- Source: Supabase RLS docs + CONTEXT.md schema decisions

-- User preferences table (single JSONB column for flexibility)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  preferences JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Analyses table for stored scores
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  breakdown JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, listing_id)
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses"
  ON public.analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON public.analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
  ON public.analyses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON public.analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### Next.js Login/Signup Server Actions
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs

// app/login/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) {
    return { error: error.message }
  }
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) {
    return { error: error.message }
  }
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
```

### Protected Dashboard Page
```typescript
// Source: Supabase Next.js auth docs

// app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/')
  }

  return (
    <div>
      <p>Logged in as: {user.email}</p>
      {/* Logout button, preferences placeholder */}
    </div>
  )
}
```

### Extension Popup Login Component
```tsx
// Extension popup login form
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleLogin}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
```

### Dockerfile for FastAPI
```dockerfile
# Source: FastAPI Docker best practices 2025

FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### WXT Config for Flatfox Extension
```typescript
// wxt.config.ts
import { defineConfig } from 'wxt'

export default defineConfig({
  srcDir: 'src',
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'HomeMatch',
    description: 'AI-powered property match scoring for Flatfox.ch',
    version: '0.1.0',
    permissions: ['storage'],
    host_permissions: ['*://*.flatfox.ch/*'],
  },
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @supabase/auth-helpers | @supabase/ssr | 2024 | Must use ssr package; auth-helpers is deprecated |
| getSession() for server auth | getUser() for server auth | 2024 | getUser() validates JWT with auth server; getSession() does not |
| Manifest V2 extensions | Manifest V3 (MV3) | 2024 enforced | Service workers instead of background pages, no localStorage |
| Supabase auto JWT verification in edge functions | Manual verification required | Late 2024 | Must explicitly verify JWTs (incompatible with new JWT signing keys) |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | 2025 | New publishable key format; both work interchangeably |
| Next.js Pages Router | Next.js App Router | Stable since Next.js 13.4+ | App Router is the default and recommended approach |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`
- `supabase.auth.getSession()` on server: Unsafe; use `getUser()` instead
- Implicit JWT verification in edge functions: Must be done explicitly now

## Open Questions

1. **Supabase Project Setup Method**
   - What we know: Supabase CLI needs to be installed, project needs to be created
   - What's unclear: Whether to create via dashboard (easier) or CLI (more reproducible)
   - Recommendation: Create project via Supabase dashboard (faster for hackathon), then `supabase link` to CLI for migrations and edge function deployment

2. **EC2 Instance Details**
   - What we know: AWS CLI is configured, Docker deployment
   - What's unclear: Whether an EC2 instance already exists or needs to be provisioned, SSH key setup, security group config
   - Recommendation: Plan should include EC2 provisioning step or verify existing instance. Open ports 8000 (API) and 22 (SSH).

3. **Extension Environment Variables**
   - What we know: WXT uses Vite, so `import.meta.env.VITE_*` works
   - What's unclear: Whether to use .env files or hardcode for hackathon
   - Recommendation: Use `.env` file in extension directory with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. WXT/Vite handles this natively.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (already configured in extension) |
| Config file | `extension/vitest.config.ts` (exists), `web/vitest.config.ts` (Wave 0) |
| Quick run command | `pnpm test` (in respective directory) |
| Full suite command | `cd extension && pnpm test && cd ../web && pnpm test` |

### Phase Requirements Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Login/signup on Next.js website | smoke (manual) | Manual: visit site, sign up, log in | N/A |
| AUTH-02 | Login in extension popup | smoke (manual) | Manual: open popup, enter credentials | N/A |
| AUTH-03 | Edge function proxies with auth | integration | `supabase functions serve` + curl with JWT | Wave 0 |
| INFRA-01 | Next.js deployed on Vercel | smoke (manual) | `curl -f https://[deployment-url]` | N/A |
| INFRA-02 | FastAPI on EC2 with health check | smoke | `curl -f http://[ec2-ip]:8000/health` | N/A |
| INFRA-03 | Supabase tables + auth + edge functions | integration (manual) | `supabase db push` + verify in dashboard | N/A |

### Sampling Rate
- **Per task commit:** Manual smoke tests (curl endpoints, visit pages)
- **Per wave merge:** All smoke tests pass
- **Phase gate:** All 5 success criteria verified manually

### Wave 0 Gaps
- [ ] Extension Vitest config already exists -- reuse pattern for fresh scaffold
- [ ] Web app needs Vitest setup if unit tests are desired (not critical for Phase 1 -- all verifications are smoke/integration)
- [ ] No automated integration tests for auth flows -- all manual verification for Phase 1 (auth flows involve browser interactions)

*(Phase 1 is primarily infrastructure/deployment -- most validation is manual smoke testing of deployed services)*

## Sources

### Primary (HIGH confidence)
- [Supabase SSR auth docs](https://supabase.com/docs/guides/auth/server-side/nextjs) - Next.js server-side auth setup, middleware, client creation
- [Supabase password auth docs](https://supabase.com/docs/guides/auth/passwords) - signUp, signInWithPassword API
- [Supabase edge functions docs](https://supabase.com/docs/guides/functions/quickstart) - Function creation, deployment, JWT verification
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) - Policy syntax, auth.uid() helper
- [WXT entrypoints docs](https://wxt.dev/guide/essentials/entrypoints.html) - File conventions, defineBackground, defineContentScript
- [WXT content scripts docs](https://wxt.dev/guide/essentials/content-scripts.html) - Match patterns, Shadow DOM React rendering
- [Supabase edge function auth docs](https://supabase.com/docs/guides/functions/auth) - JWT verification with jose, getUser pattern

### Secondary (MEDIUM confidence)
- [Supabase Chrome extension storage adapter discussion](https://github.com/orgs/supabase/discussions/21923) - Custom chrome.storage adapter pattern, verified by multiple community members
- [Akos Komuves - Browser extensions + Supabase](https://akoskm.com/how-to-connect-browser-extensions-to-supabase/) - Background script auth centralization pattern
- [Ryan Katayi - Next.js Supabase SSR setup](https://www.ryankatayi.com/blog/server-side-auth-in-next-js-with-supabase-my-setup) - Complete server.ts, middleware.ts, actions.ts code
- [FastAPI Docker best practices](https://betterstack.com/community/guides/scaling-python/fastapi-docker-best-practices/) - Dockerfile structure, health checks, layer caching

### Tertiary (LOW confidence)
- EC2 deployment specifics -- depends on existing AWS setup, needs validation during implementation
- Extension-to-web shared auth -- user decided inline popup login (not redirect), simplifies this significantly

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are well-documented, official, and have up-to-date guides
- Architecture: HIGH - Supabase + Next.js + WXT patterns are well-established with official examples
- Pitfalls: HIGH - Known issues documented in official docs and community discussions
- Edge function proxy: MEDIUM - JWT verification approach changed recently, needs careful implementation
- Chrome extension auth: MEDIUM - Custom storage adapter is community pattern, not officially documented by Supabase

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable stack, no fast-moving components)
