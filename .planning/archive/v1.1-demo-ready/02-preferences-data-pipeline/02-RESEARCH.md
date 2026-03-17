# Phase 2: Preferences & Data Pipeline - Research

**Researched:** 2026-03-10
**Domain:** Next.js preferences form (shadcn/ui + React Hook Form + Zod) + FastAPI Flatfox API integration (httpx + Pydantic)
**Confidence:** HIGH

## Summary

Phase 2 has two independent tracks that share only the Supabase preferences table schema as their contract. The **frontend track** builds a single-page preferences form on Next.js with collapsible sections (standard filters, soft criteria, weight sliders) that persists to Supabase JSONB. The **backend track** builds a FastAPI service that fetches and parses Flatfox listing data via their public API.

The Flatfox public API has been **live-verified**: the endpoint is `GET /api/v1/public-listing/{pk}/` (NOT `/api/v1/flat/` as originally assumed in PROJECT.md). It returns comprehensive listing data including pricing (rent_net, rent_charges, rent_gross), location (street, city, zipcode, coordinates), dimensions (surface_living, number_of_rooms, floor), attributes (balcony, parking, elevator, etc.), and description text. No authentication is required for the public listing endpoint. This is a critical finding that corrects the earlier assumption about the API path.

For the frontend, the standard stack is shadcn/ui Accordion for collapsible sections, React Hook Form with Zod resolver for validation, and shadcn/ui Slider for weight controls. Supabase JSONB upsert handles persistence. The form structure maps directly to the 10 PREF requirements.

**Primary recommendation:** Use shadcn/ui Accordion (type="multiple") for collapsible sections, React Hook Form + Zod for the entire preferences form, and httpx.AsyncClient with Pydantic models for the Flatfox API integration. The preferences JSONB schema should be defined as a Zod schema on the frontend and a Pydantic model on the backend to ensure consistency.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PREF-01 | User can set location/city preference | Text input field in Standard Filters section, stored in preferences JSONB |
| PREF-02 | User can select buy or rent | Radio group or toggle in Standard Filters section (maps to Flatfox offer_type: RENT/SALE) |
| PREF-03 | User can select property type | Select dropdown in Standard Filters section (maps to Flatfox object_category: APARTMENT/HOUSE + object_type variants) |
| PREF-04 | User can set budget range (min/max CHF) | Dual number inputs in Standard Filters section (matches Flatfox rent_gross/price_display fields) |
| PREF-05 | User can set rooms range (min/max) | Dual number inputs in Standard Filters section (matches Flatfox number_of_rooms field, note: string like "3.5") |
| PREF-06 | User can set living space range (min/max sqm) | Dual number inputs in Standard Filters section (matches Flatfox surface_living field) |
| PREF-07 | User can add soft criteria text fields | Dynamic text field array in Soft Criteria section, using React Hook Form useFieldArray |
| PREF-08 | Reusable soft criteria suggestions | Chip/tag selector with predefined suggestions (maps to Flatfox attribute names + common criteria) |
| PREF-09 | User can configure importance weights per category | Slider inputs (0-100) in Weights section, one per scoring category |
| PREF-10 | Preferences saved to Supabase PostgreSQL and persist across sessions | Supabase upsert to user_preferences table JSONB column with auto-load on page mount |
| DATA-01 | Backend fetches listing details from Flatfox public API | FastAPI endpoint using httpx.AsyncClient to GET /api/v1/public-listing/{pk}/ |
| DATA-02 | Backend parses Flatfox listing data into structured format | Pydantic model maps all Flatfox fields to typed Python dataclass |
</phase_requirements>

## Standard Stack

### Core (Frontend - Preferences Form)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Hook Form | 7.x | Form state management | De facto standard for React forms, excellent performance (uncontrolled components) |
| @hookform/resolvers | 3.x | Zod integration for RHF | Official bridge between React Hook Form and Zod validation |
| Zod | 3.x | Schema validation | Already used in project (Phase 1 CONTEXT.md confirms), shared with backend conceptually |
| shadcn/ui Accordion | latest | Collapsible sections | Already in project stack, built on Radix UI, accessible, type="multiple" for all-open |
| shadcn/ui Slider | latest | Weight sliders | Already in project stack, supports range values, Radix UI primitive |
| shadcn/ui Select | latest | Dropdown selections | Already in project stack, accessible, controlled |
| shadcn/ui Input | latest | Text inputs | Already installed in Phase 1 |
| shadcn/ui Button | latest | Form actions | Already installed in Phase 1 |
| shadcn/ui Badge | latest | Soft criteria chips | Tag-like display for selected feature suggestions |
| shadcn/ui Card | latest | Section containers | Already installed in Phase 1 |
| @supabase/ssr | 0.5.x+ | Server-side Supabase client | Already installed in Phase 1, used for data operations |

### Core (Backend - Flatfox Integration)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| httpx | 0.28.x | Async HTTP client | FastAPI recommended, async-native, already bundled with FastAPI |
| Pydantic | 2.x | Data models + validation | FastAPI-native, automatic JSON parsing, type coercion |
| FastAPI | 0.115.x+ | API framework | Already scaffolded in Phase 1 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | latest | Icons for form UI | Collapse/expand chevrons, add/remove buttons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Hook Form | Formik | RHF is lighter, better performance with uncontrolled inputs, better shadcn/ui integration |
| shadcn/ui Accordion | Custom collapsible | Accordion provides animation, accessibility, keyboard nav for free |
| httpx | aiohttp | httpx is simpler API, already installed with FastAPI, cleaner async/await pattern |
| httpx | requests | requests is synchronous, would block FastAPI's event loop in async endpoints |

**Installation (web/):**
```bash
cd web && pnpm add react-hook-form @hookform/resolvers zod
pnpm dlx shadcn@latest add accordion slider select badge separator
```

**Installation (backend/):**
```bash
# Add to backend/requirements.txt:
httpx
# Pydantic is already included with FastAPI
```

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)
```
web/src/
  app/
    dashboard/
      page.tsx                  # Dashboard with preferences form
      actions.ts                # Server actions for save/load preferences
  components/
    preferences/
      preferences-form.tsx      # Main form container with Accordion sections
      standard-filters.tsx      # Location, buy/rent, type, budget, rooms, space
      soft-criteria.tsx          # Free-text criteria + suggestion chips
      weight-sliders.tsx         # Category weight sliders
  lib/
    schemas/
      preferences.ts            # Zod schema for preferences JSONB
    supabase/
      client.ts                 # (exists from Phase 1)
      server.ts                 # (exists from Phase 1)

backend/
  app/
    main.py                     # FastAPI app (add /listing/{pk} endpoint)
    models/
      listing.py                # Pydantic model for Flatfox listing
      preferences.py            # Pydantic model for preferences (mirrors Zod schema)
    services/
      flatfox.py                # Flatfox API client (httpx)
    routers/
      listings.py               # Listing-related endpoints
```

### Pattern 1: Preferences Form with React Hook Form + shadcn/ui Accordion
**What:** Single-page form with collapsible sections, each section maps to a preference group
**When to use:** The entire preferences page
**Example:**
```typescript
// Source: shadcn/ui docs + React Hook Form docs

// lib/schemas/preferences.ts
import { z } from 'zod'

export const preferencesSchema = z.object({
  // Standard filters
  location: z.string().optional().default(''),
  offerType: z.enum(['RENT', 'SALE']).default('RENT'),
  objectCategory: z.enum(['APARTMENT', 'HOUSE', 'ANY']).default('ANY'),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  roomsMin: z.number().min(0).optional(),
  roomsMax: z.number().min(0).optional(),
  livingSpaceMin: z.number().min(0).optional(),
  livingSpaceMax: z.number().min(0).optional(),
  // Soft criteria
  softCriteria: z.array(z.string()).default([]),
  selectedFeatures: z.array(z.string()).default([]),
  // Weights (0-100, default 50)
  weights: z.object({
    location: z.number().min(0).max(100).default(50),
    price: z.number().min(0).max(100).default(50),
    size: z.number().min(0).max(100).default(50),
    features: z.number().min(0).max(100).default(50),
    condition: z.number().min(0).max(100).default(50),
  }),
})

export type Preferences = z.infer<typeof preferencesSchema>
```

```tsx
// components/preferences/preferences-form.tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Form } from '@/components/ui/form'
import { preferencesSchema, type Preferences } from '@/lib/schemas/preferences'

export function PreferencesForm({ defaultValues, onSave }: {
  defaultValues: Preferences
  onSave: (data: Preferences) => Promise<void>
}) {
  const form = useForm<Preferences>({
    resolver: zodResolver(preferencesSchema),
    defaultValues,
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <Accordion type="multiple" defaultValue={['filters', 'criteria', 'weights']}>
          <AccordionItem value="filters">
            <AccordionTrigger>Standard Filters</AccordionTrigger>
            <AccordionContent>
              <StandardFilters form={form} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="criteria">
            <AccordionTrigger>Soft Criteria</AccordionTrigger>
            <AccordionContent>
              <SoftCriteria form={form} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="weights">
            <AccordionTrigger>Category Weights</AccordionTrigger>
            <AccordionContent>
              <WeightSliders form={form} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Save Preferences
        </Button>
      </form>
    </Form>
  )
}
```

### Pattern 2: Supabase JSONB Upsert for Preferences
**What:** Save entire preferences object as JSONB, load on page mount
**When to use:** Saving and loading preferences
**Example:**
```typescript
// Source: Supabase docs - upsert + JSONB

// app/dashboard/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { preferencesSchema, type Preferences } from '@/lib/schemas/preferences'

export async function savePreferences(data: Preferences) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Validate with Zod before saving
  const validated = preferencesSchema.parse(data)

  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      { user_id: user.id, preferences: validated, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) throw new Error(error.message)
}

export async function loadPreferences(): Promise<Preferences | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_preferences')
    .select('preferences')
    .eq('user_id', user.id)
    .single()

  if (error || !data) return null
  return preferencesSchema.parse(data.preferences)
}
```

### Pattern 3: Slider with React Hook Form Integration
**What:** shadcn/ui Slider properly wired to React Hook Form
**When to use:** Weight sliders for category importance
**Example:**
```tsx
// Source: shadcn/ui Slider + React Hook Form discussion #783
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Slider } from '@/components/ui/slider'

function WeightSlider({ form, name, label }: {
  form: UseFormReturn<Preferences>
  name: string
  label: string
}) {
  return (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem>
          <div className="flex justify-between">
            <FormLabel>{label}</FormLabel>
            <span className="text-sm text-muted-foreground">{field.value}</span>
          </div>
          <FormControl>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[field.value]}
              onValueChange={(vals) => field.onChange(vals[0])}
            />
          </FormControl>
        </FormItem>
      )}
    />
  )
}
```

### Pattern 4: Dynamic Soft Criteria with useFieldArray
**What:** Add/remove free-text soft criteria fields dynamically
**When to use:** PREF-07 soft criteria text fields
**Example:**
```tsx
// Source: React Hook Form docs - useFieldArray
import { useFieldArray } from 'react-hook-form'

function SoftCriteria({ form }: { form: UseFormReturn<Preferences> }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'softCriteria',
  })

  return (
    <div className="space-y-4">
      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2">
        {FEATURE_SUGGESTIONS.map((feature) => (
          <Badge
            key={feature}
            variant={form.watch('selectedFeatures').includes(feature) ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleFeature(form, feature)}
          >
            {feature}
          </Badge>
        ))}
      </div>

      {/* Free text criteria */}
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <Input {...form.register(`softCriteria.${index}`)} placeholder="e.g., near Bahnhof" />
          <Button variant="ghost" size="icon" onClick={() => remove(index)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" onClick={() => append('')}>
        Add Criterion
      </Button>
    </div>
  )
}
```

### Pattern 5: FastAPI Flatfox Client with httpx.AsyncClient
**What:** Async HTTP client for Flatfox API with Pydantic model parsing
**When to use:** DATA-01 and DATA-02
**Example:**
```python
# Source: FastAPI docs + httpx docs + live-verified Flatfox API

# app/services/flatfox.py
import httpx
from app.models.listing import FlatfoxListing

FLATFOX_BASE_URL = "https://flatfox.ch/api/v1"

class FlatfoxClient:
    def __init__(self):
        self._client: httpx.AsyncClient | None = None

    async def get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=FLATFOX_BASE_URL,
                timeout=30.0,
                headers={"Accept": "application/json"},
            )
        return self._client

    async def get_listing(self, pk: int) -> FlatfoxListing:
        client = await self.get_client()
        response = await client.get(f"/public-listing/{pk}/")
        response.raise_for_status()
        return FlatfoxListing.model_validate(response.json())

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

# Singleton instance
flatfox_client = FlatfoxClient()
```

```python
# app/models/listing.py
from pydantic import BaseModel, Field
from typing import Optional

class FlatfoxAgencyLogo(BaseModel):
    url: str
    url_org_logo_m: Optional[str] = None

class FlatfoxAgency(BaseModel):
    name: Optional[str] = None
    name_2: Optional[str] = None
    street: Optional[str] = None
    zipcode: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    logo: Optional[FlatfoxAgencyLogo] = None

class FlatfoxAttribute(BaseModel):
    name: str

class FlatfoxListing(BaseModel):
    """Pydantic model for Flatfox public listing API response.

    Endpoint: GET /api/v1/public-listing/{pk}/
    No authentication required.
    """
    pk: int
    slug: str
    url: str
    short_url: str
    status: str
    offer_type: str  # "RENT" or "SALE"
    object_category: str  # "APARTMENT", "HOUSE", "PARK", "INDUSTRY"
    object_type: str  # "APARTMENT", "SINGLE_HOUSE", "GARAGE_SLOT", etc.
    # Pricing
    price_display: Optional[int] = None
    price_display_type: Optional[str] = None
    price_unit: Optional[str] = None  # "monthly"
    rent_net: Optional[int] = None
    rent_charges: Optional[int] = None
    rent_gross: Optional[int] = None
    # Titles and description
    short_title: Optional[str] = None
    public_title: Optional[str] = None
    pitch_title: Optional[str] = None
    description_title: Optional[str] = None
    description: Optional[str] = None
    # Dimensions
    surface_living: Optional[int] = None
    surface_property: Optional[int] = None
    surface_usable: Optional[int] = None
    number_of_rooms: Optional[str] = None  # NOTE: string, e.g. "3.5"
    floor: Optional[int] = None
    # Location
    street: Optional[str] = None
    zipcode: Optional[int] = None
    city: Optional[str] = None
    public_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    state: Optional[str] = None  # Canton code, e.g. "ZH", "BE"
    country: Optional[str] = None  # "CH"
    # Features
    attributes: list[FlatfoxAttribute] = Field(default_factory=list)
    is_furnished: bool = False
    is_temporary: bool = False
    # Dates
    year_built: Optional[int] = None
    year_renovated: Optional[int] = None
    moving_date_type: Optional[str] = None  # "imm" (immediate), "agr" (by agreement)
    moving_date: Optional[str] = None
    published: Optional[str] = None
    created: Optional[str] = None
    # Media (image IDs, not URLs)
    cover_image: Optional[int] = None
    images: list[int] = Field(default_factory=list)
    documents: list[int] = Field(default_factory=list)
    video_url: Optional[str] = None
    tour_url: Optional[str] = None
    # Agency
    agency: Optional[FlatfoxAgency] = None
    reserved: bool = False
```

```python
# app/routers/listings.py
from fastapi import APIRouter, HTTPException
from app.services.flatfox import flatfox_client
from app.models.listing import FlatfoxListing

router = APIRouter(prefix="/listings", tags=["listings"])

@router.get("/{pk}", response_model=FlatfoxListing)
async def get_listing(pk: int):
    """Fetch and parse a Flatfox listing by its pk (primary key).

    This is a test endpoint for validating Flatfox API integration.
    """
    try:
        listing = await flatfox_client.get_listing(pk)
        return listing
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Listing {pk} not found on Flatfox")
        raise HTTPException(status_code=502, detail="Flatfox API error")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Could not reach Flatfox API")
```

### Pattern 6: FastAPI Lifespan for httpx Client Management
**What:** Initialize and cleanup httpx.AsyncClient with FastAPI lifespan events
**When to use:** Managing the Flatfox HTTP client lifecycle
**Example:**
```python
# Source: FastAPI docs - lifespan events

# app/main.py (updated)
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.services.flatfox import flatfox_client
from app.routers import listings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: nothing needed (lazy init)
    yield
    # Shutdown: close httpx client
    await flatfox_client.close()

app = FastAPI(title="HomeMatch API", version="0.2.0", lifespan=lifespan)
app.include_router(listings.router)
```

### Anti-Patterns to Avoid
- **Using requests (sync) in async FastAPI endpoints:** Will block the event loop. Always use httpx.AsyncClient for external HTTP calls.
- **Creating a new httpx.AsyncClient per request:** Connection pool overhead. Use a shared client instance with lifespan management.
- **Saving preferences with Supabase insert (not upsert):** Will fail on second save with unique constraint violation. Always use upsert with onConflict: 'user_id'.
- **Using getSession() to check auth before saving:** Insecure on server side. Always use getUser() which verifies the JWT.
- **Storing Zod schema only in frontend:** The preferences schema should be conceptually mirrored in the backend as a Pydantic model for Phase 3 when the scoring pipeline reads preferences.
- **Hardcoding property types/categories:** Use constants derived from the actual Flatfox API values (APARTMENT, HOUSE, etc.) so they stay in sync.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state management | Manual useState per field | React Hook Form useForm | Performance (uncontrolled), validation, dirty tracking, all free |
| Form validation | Manual if/else checks | Zod schema + zodResolver | Type-safe, reusable, shared between client/server |
| Collapsible sections | Custom CSS toggle | shadcn/ui Accordion | Animation, accessibility, keyboard nav, ARIA attributes |
| Weight slider UI | Custom range input | shadcn/ui Slider | Accessible, styled, range support, touch-friendly |
| HTTP client lifecycle | Manual open/close | FastAPI lifespan context manager | Ensures cleanup on shutdown, no leaked connections |
| Flatfox response parsing | Manual dict access | Pydantic model_validate | Type checking, optional field handling, validation errors |
| Dynamic form fields | Manual array state | React Hook Form useFieldArray | Handles add/remove/reorder with proper form integration |

**Key insight:** React Hook Form + Zod + shadcn/ui form components form a tight, well-integrated stack. Breaking out of this stack (e.g., using plain useState for a slider) creates integration headaches. Stay within the stack.

## Common Pitfalls

### Pitfall 1: Flatfox API Path Confusion
**What goes wrong:** Using `/api/v1/flat/` (documented in PROJECT.md) instead of the correct `/api/v1/public-listing/` endpoint.
**Why it happens:** PROJECT.md references `/api/v1/flat/` based on early reverse-engineering. The actual public endpoint is `/api/v1/public-listing/`.
**How to avoid:** Use `GET https://flatfox.ch/api/v1/public-listing/{pk}/` for single listing detail. The `/api/v1/listing/` endpoint requires authentication. Live-verified on 2026-03-10: `/api/v1/flat/` returns 404, `/api/v1/public-listing/` returns data.
**Warning signs:** 404 responses from Flatfox API.

### Pitfall 2: Flatfox number_of_rooms is a String
**What goes wrong:** Treating number_of_rooms as a number and getting type errors.
**Why it happens:** Flatfox returns number_of_rooms as a string like "3.5", "1.0", etc. Swiss property convention uses half-rooms (3.5 = 3 rooms + 1 half room).
**How to avoid:** Store as string in Pydantic model, parse to float only when comparing against user preferences. In the preferences form, use number inputs but convert to float for comparison.
**Warning signs:** Pydantic validation errors, comparison logic bugs.

### Pitfall 3: Supabase Upsert Without onConflict
**What goes wrong:** Duplicate key error when user saves preferences a second time.
**Why it happens:** user_preferences table has UNIQUE(user_id). Plain insert fails on second save.
**How to avoid:** Always use `.upsert({...}, { onConflict: 'user_id' })`. The Phase 1 schema already has the UNIQUE constraint.
**Warning signs:** 409 Conflict or "duplicate key value violates unique constraint" error.

### Pitfall 4: Slider onValueChange vs onChange
**What goes wrong:** Slider value changes don't propagate to React Hook Form.
**Why it happens:** shadcn/ui Slider uses `onValueChange` (Radix convention), not `onChange` (HTML convention). React Hook Form's field.onChange expects to be called directly.
**How to avoid:** Wire with `onValueChange={(vals) => field.onChange(vals[0])}`. Never pass field.onChange directly to onValueChange since the Slider passes an array, not a single value.
**Warning signs:** Slider moves visually but form value stays at default.

### Pitfall 5: Empty Preferences on First Load
**What goes wrong:** Form crashes or shows blank values for new users who have no preferences row.
**Why it happens:** Supabase query returns null/empty for users who haven't saved preferences yet.
**How to avoid:** Define default values in the Zod schema using `.default()`, and use `preferencesSchema.parse(data?.preferences ?? {})` which will apply all defaults for missing fields.
**Warning signs:** React errors about uncontrolled/controlled component switching.

### Pitfall 6: httpx Client Not Closed on Shutdown
**What goes wrong:** Connection pool leak warnings, open TCP connections after server stops.
**Why it happens:** httpx.AsyncClient needs explicit `.aclose()` call.
**How to avoid:** Use FastAPI lifespan context manager to close the client on shutdown. See Pattern 6 above.
**Warning signs:** ResourceWarning about unclosed connections in logs.

### Pitfall 7: Flatfox API Rate Limiting
**What goes wrong:** Requests start returning 429 Too Many Requests.
**Why it happens:** Flatfox likely has rate limits on their public API (undocumented).
**How to avoid:** For Phase 2, rate limiting is unlikely since we only fetch one listing at a time for testing. For Phase 3 (batch scoring), consider adding retry logic with exponential backoff. The httpx client supports configuring retries.
**Warning signs:** 429 responses, connection resets.

## Code Examples

### Flatfox API Response (Verified Live 2026-03-10)

Endpoint: `GET https://flatfox.ch/api/v1/public-listing/{pk}/`

**List endpoint**: `GET https://flatfox.ch/api/v1/public-listing/?limit=N&offset=M`

Returns paginated results:
```json
{
  "count": 33823,
  "next": "https://flatfox.ch/api/v1/public-listing/?limit=1&offset=1",
  "previous": null,
  "results": [{ ... listing object ... }]
}
```

**Detail endpoint**: `GET https://flatfox.ch/api/v1/public-listing/1788170/`

Returns a single listing object with these verified fields:
```json
{
  "pk": 1788170,
  "slug": "platanenweg-7-4914-roggwil-be",
  "url": "/en/flat/platanenweg-7-4914-roggwil-be/1788170/",
  "status": "act",
  "offer_type": "RENT",
  "object_category": "APARTMENT",
  "object_type": "APARTMENT",
  "rent_net": 1540,
  "rent_charges": 250,
  "rent_gross": 1790,
  "price_display": 1790,
  "price_display_type": "TOTAL",
  "price_unit": "monthly",
  "description": "Lieben Sie Ruhe und Erholung? ...",
  "description_title": "Hier sind Sie auf der Sonnenseite ...",
  "surface_living": 29,
  "number_of_rooms": "1.0",
  "floor": 1,
  "street": "Platanenweg 7",
  "zipcode": 4914,
  "city": "Roggwil BE",
  "public_address": "Platanenweg 7, 4914 Roggwil BE",
  "latitude": 47.24511562,
  "longitude": 7.818068100000001,
  "year_built": 1963,
  "year_renovated": 2019,
  "attributes": [
    {"name": "garage"},
    {"name": "balconygarden"},
    {"name": "parkingspace"},
    {"name": "petsallowed"},
    {"name": "cable"}
  ],
  "images": [32540859, 32540860, ...],
  "cover_image": 32540859,
  "agency": {"name": "...", "street": "...", "logo": {...}},
  "reserved": false,
  "country": "CH",
  "state": "BE"
}
```

### Verified Flatfox Enum Values (from live API sampling)

**offer_type:** `"RENT"`, `"SALE"`

**object_category:** `"APARTMENT"`, `"HOUSE"`, `"PARK"`, `"INDUSTRY"`

**object_type:** `"APARTMENT"`, `"SINGLE_HOUSE"`, `"GARAGE_SLOT"`, `"ARCADE"`, `"ATELIER"`, `"COMMERCIAL"`, `"COVERED_PARKING_PLACE_BIKE"`, `"INDUSTRIAL_OBJECT"`, `"OFFICE"`, `"OPEN_SLOT"`, `"SHOP"`, `"SINGLE_GARAGE"`, `"STORAGE_ROOM"`

**attributes (features):** `"accessiblewithwheelchair"`, `"balconygarden"`, `"cable"`, `"dishwasher"`, `"garage"`, `"lift"`, `"minergie"`, `"parkingspace"`, `"parquetflooring"`, `"petsallowed"`, `"view"`, `"washingmachine"`

**moving_date_type:** `"imm"` (immediate), `"agr"` (by agreement)

### Feature Suggestions for Soft Criteria (PREF-08)

These map directly to Flatfox attribute names. Display with human-friendly labels:

```typescript
export const FEATURE_SUGGESTIONS = [
  { value: 'balconygarden', label: 'Balcony / Garden' },
  { value: 'parkingspace', label: 'Parking Space' },
  { value: 'garage', label: 'Garage' },
  { value: 'lift', label: 'Elevator' },
  { value: 'dishwasher', label: 'Dishwasher' },
  { value: 'washingmachine', label: 'Washing Machine' },
  { value: 'petsallowed', label: 'Pets Allowed' },
  { value: 'minergie', label: 'Minergie (Energy Efficient)' },
  { value: 'parquetflooring', label: 'Parquet Flooring' },
  { value: 'view', label: 'View' },
  { value: 'cable', label: 'Cable TV' },
  { value: 'accessiblewithwheelchair', label: 'Wheelchair Accessible' },
] as const
```

### Preferences JSONB Schema (shared contract between frontend and backend)

```typescript
// Frontend Zod schema (web/src/lib/schemas/preferences.ts)
export const preferencesSchema = z.object({
  // Standard filters (PREF-01 through PREF-06)
  location: z.string().default(''),
  offerType: z.enum(['RENT', 'SALE']).default('RENT'),
  objectCategory: z.enum(['APARTMENT', 'HOUSE', 'ANY']).default('ANY'),
  budgetMin: z.number().nullable().default(null),
  budgetMax: z.number().nullable().default(null),
  roomsMin: z.number().nullable().default(null),
  roomsMax: z.number().nullable().default(null),
  livingSpaceMin: z.number().nullable().default(null),
  livingSpaceMax: z.number().nullable().default(null),

  // Soft criteria (PREF-07 and PREF-08)
  softCriteria: z.array(z.string()).default([]),
  selectedFeatures: z.array(z.string()).default([]),

  // Weights (PREF-09)
  weights: z.object({
    location: z.number().min(0).max(100).default(50),
    price: z.number().min(0).max(100).default(50),
    size: z.number().min(0).max(100).default(50),
    features: z.number().min(0).max(100).default(50),
    condition: z.number().min(0).max(100).default(50),
  }).default({}),
})
```

```python
# Backend Pydantic model (backend/app/models/preferences.py)
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class OfferType(str, Enum):
    RENT = "RENT"
    SALE = "SALE"

class ObjectCategory(str, Enum):
    APARTMENT = "APARTMENT"
    HOUSE = "HOUSE"
    ANY = "ANY"

class Weights(BaseModel):
    location: int = Field(default=50, ge=0, le=100)
    price: int = Field(default=50, ge=0, le=100)
    size: int = Field(default=50, ge=0, le=100)
    features: int = Field(default=50, ge=0, le=100)
    condition: int = Field(default=50, ge=0, le=100)

class UserPreferences(BaseModel):
    location: str = ""
    offer_type: OfferType = OfferType.RENT
    object_category: ObjectCategory = ObjectCategory.ANY
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    rooms_min: Optional[float] = None
    rooms_max: Optional[float] = None
    living_space_min: Optional[int] = None
    living_space_max: Optional[int] = None
    soft_criteria: list[str] = Field(default_factory=list)
    selected_features: list[str] = Field(default_factory=list)
    weights: Weights = Field(default_factory=Weights)
```

### Dashboard Page with Preferences Load
```typescript
// app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PreferencesForm } from '@/components/preferences/preferences-form'
import { loadPreferences, savePreferences } from './actions'
import { preferencesSchema } from '@/lib/schemas/preferences'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const saved = await loadPreferences()
  const defaults = preferencesSchema.parse(saved ?? {})

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Your Preferences</h1>
      <PreferencesForm defaultValues={defaults} onSave={savePreferences} />
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flatfox `/api/v1/flat/` | `/api/v1/public-listing/` | Unknown (verified 2026-03-10) | Must use public-listing endpoint; flat returns 404 |
| Flatfox `/api/v1/listing/` (auth required) | `/api/v1/public-listing/` (no auth) | N/A | Public endpoint requires no API key |
| requests library for HTTP in Python | httpx (async-native) | 2023+ | httpx is the standard for async FastAPI; requests blocks event loop |
| Formik for React forms | React Hook Form | 2022+ | RHF is lighter, faster, better TypeScript support |
| Manual form validation | Zod + zodResolver | 2023+ | Type-safe validation shared between client and server |
| shadcn/ui v0 (copy-paste CLI) | shadcn/ui v2 (npx shadcn add) | 2024 | Simplified component installation |

**Deprecated/outdated:**
- `Flatfox /api/v1/flat/` endpoint: Returns 404, use `/api/v1/public-listing/` instead
- `requests` library in async FastAPI: Blocks event loop, use httpx
- Manual form state with useState: Use React Hook Form for any form with >3 fields

## Open Questions

1. **Flatfox Image URLs**
   - What we know: Listings return image IDs as integers (e.g., 32540859), not URLs
   - What's unclear: How to construct image URLs from IDs. Tried `/listing/image/{id}/` and `/thumb/listing/{id}/` -- both returned 404
   - Recommendation: Not blocking for Phase 2 (DATA-01/DATA-02 only need listing data). Image URL resolution can be deferred to Phase 4 if needed for the analysis page. The cover_image and images fields should still be parsed and stored.

2. **Flatfox API Rate Limits**
   - What we know: Public endpoint works without auth, no rate limit headers observed in responses
   - What's unclear: Exact rate limits, if any
   - Recommendation: Single-listing fetches are low volume. Add basic error handling for 429 responses. Full rate limit investigation deferred to Phase 3 batch scoring.

3. **Weight Categories Finality**
   - What we know: Five categories proposed (location, price, size, features, condition)
   - What's unclear: Whether these are the optimal categories for Phase 3 LLM scoring
   - Recommendation: Build the UI with these 5 categories but design the schema to be flexible (the JSONB approach already supports this). Phase 3 may adjust categories during prompt engineering.

4. **Flatfox Filter Parameters**
   - What we know: The list endpoint accepts `limit` and `offset` parameters
   - What's unclear: Whether filter parameters like `object_category`, `offer_type`, `city` are supported (tested `object_category=APRT` -- it was ignored, not an error)
   - Recommendation: Not blocking for Phase 2 (we fetch by pk, not by search). Filter discovery deferred to future needs.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (frontend), pytest (backend) |
| Config file | `web/vitest.config.ts` (Wave 0 if missing), `backend/pytest.ini` or `pyproject.toml` (Wave 0) |
| Quick run command | `cd web && pnpm test` / `cd backend && pytest -x` |
| Full suite command | `cd web && pnpm test && cd ../backend && pytest` |

### Phase Requirements Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PREF-01 | Location input saves/loads | unit | `cd web && pnpm test -- --grep "location"` | Wave 0 |
| PREF-02 | Buy/rent toggle saves/loads | unit | `cd web && pnpm test -- --grep "offerType"` | Wave 0 |
| PREF-03 | Property type select saves/loads | unit | `cd web && pnpm test -- --grep "objectCategory"` | Wave 0 |
| PREF-04 | Budget range saves/loads | unit | `cd web && pnpm test -- --grep "budget"` | Wave 0 |
| PREF-05 | Rooms range saves/loads | unit | `cd web && pnpm test -- --grep "rooms"` | Wave 0 |
| PREF-06 | Living space range saves/loads | unit | `cd web && pnpm test -- --grep "livingSpace"` | Wave 0 |
| PREF-07 | Dynamic soft criteria add/remove | unit | `cd web && pnpm test -- --grep "softCriteria"` | Wave 0 |
| PREF-08 | Feature suggestion toggle | unit | `cd web && pnpm test -- --grep "features"` | Wave 0 |
| PREF-09 | Weight sliders save values | unit | `cd web && pnpm test -- --grep "weights"` | Wave 0 |
| PREF-10 | Preferences persist across refresh | integration (manual) | Manual: save, refresh, verify values load | N/A |
| DATA-01 | Fetch listing from Flatfox API | integration | `cd backend && pytest tests/test_flatfox.py -x` | Wave 0 |
| DATA-02 | Parse listing into structured model | unit | `cd backend && pytest tests/test_listing_model.py -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd web && pnpm test` / `cd backend && pytest -x`
- **Per wave merge:** Full suite across both projects
- **Phase gate:** All PREF tests pass + DATA endpoint returns parsed listing for a known pk

### Wave 0 Gaps
- [ ] `web/vitest.config.ts` -- may need creation if not set up in Phase 1
- [ ] `web/src/__tests__/preferences-schema.test.ts` -- Zod schema validation tests
- [ ] `backend/tests/test_listing_model.py` -- Pydantic model parsing tests with sample Flatfox JSON
- [ ] `backend/tests/test_flatfox.py` -- Integration test hitting real Flatfox API (or mocked)
- [ ] `backend/pyproject.toml` or `pytest.ini` -- pytest configuration if not present
- [ ] `pip install pytest httpx` -- test dependencies

## Sources

### Primary (HIGH confidence)
- **Flatfox Public API** - Live-verified 2026-03-10 via curl. Confirmed endpoint: `GET /api/v1/public-listing/{pk}/`. No auth required. Full response structure documented above.
- [shadcn/ui Form docs](https://ui.shadcn.com/docs/components/form) - React Hook Form + Zod integration pattern
- [shadcn/ui Accordion docs](https://ui.shadcn.com/docs/components/radix/accordion) - Collapsible section component
- [shadcn/ui Slider docs](https://ui.shadcn.com/docs/components/radix/slider) - Range slider component
- [React Hook Form docs](https://react-hook-form.com/) - useForm, useFieldArray, zodResolver patterns
- [Supabase upsert docs](https://supabase.com/docs/reference/javascript/v1/upsert) - JSONB upsert with onConflict
- [Supabase JSONB guide](https://supabase.com/docs/guides/database/json) - JSON column handling

### Secondary (MEDIUM confidence)
- [shadcn/ui Slider + React Hook Form discussion #783](https://github.com/shadcn-ui/ui/discussions/783) - onValueChange wiring pattern
- [codebar-ag/laravel-flatfox](https://github.com/codebar-ag/laravel-flatfox) - Complete Flatfox DTO field list, confirmed against live API
- [FastAPI httpx best practices](https://medium.com/@benshearlaw/how-to-use-httpx-request-client-with-fastapi-16255a9984a4) - AsyncClient lifecycle management
- [Zod API docs](https://zod.dev/api) - Schema definition patterns, optional/default handling

### Tertiary (LOW confidence)
- Flatfox image URL resolution -- could not determine pattern from API or web requests
- Flatfox API rate limits -- no documentation found, no rate limit headers observed
- Flatfox list endpoint filter parameters -- tested but parameters appeared to be ignored

## Metadata

**Confidence breakdown:**
- Flatfox API structure: HIGH - Live-verified with real API calls, every field documented
- Frontend form stack: HIGH - shadcn/ui + React Hook Form + Zod is well-documented standard
- Preferences schema: HIGH - Mapped directly to Flatfox field types and PREF requirements
- Supabase JSONB operations: HIGH - Official docs, straightforward upsert pattern
- Backend httpx patterns: HIGH - FastAPI standard, well-documented
- Flatfox image URLs: LOW - Could not resolve, not blocking for Phase 2
- Flatfox rate limits: LOW - Unknown, not blocking for Phase 2

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (Flatfox API is stable; form libraries are mature)
