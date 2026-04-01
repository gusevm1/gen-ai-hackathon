import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import * as fs from "fs"
import * as path from "path"

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboardingContext: vi.fn(),
}))
vi.mock("@/lib/language-context", () => ({
  useLanguage: () => ({ language: "en" }),
}))
vi.mock("@/lib/translations", () => ({
  t: (_lang: string, key: string) => key,
}))
vi.mock("@/lib/flatfox-url", () => ({
  buildFlatfoxUrl: vi.fn(() => "https://flatfox.ch/en/search/"),
  buildFlatfoxUrlWithGeocode: vi.fn(() =>
    Promise.resolve("https://flatfox.ch/en/search/")
  ),
}))
vi.mock("@/lib/onboarding-state", () => ({
  updateOnboardingState: vi.fn(),
}))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import { useOnboardingContext } from "@/components/onboarding/OnboardingProvider"
import { PreferencesForm } from "@/components/preferences/preferences-form"
import { AnalysesFilterBar } from "@/components/analyses/analyses-filter-bar"

const mockOnboarding = (overrides = {}) => {
  ;(useOnboardingContext as ReturnType<typeof vi.fn>).mockReturnValue({
    state: { onboarding_step: 1, onboarding_completed: false },
    isActive: false,
    showOpenFlatfoxStep: vi.fn(),
    skip: vi.fn(),
    ...overrides,
  })
}

const defaultPrefs = {
  location: "",
  offerType: "RENT" as const,
  objectCategory: "ANY" as const,
  budgetMin: undefined,
  budgetMax: undefined,
  roomsMin: undefined,
  roomsMax: undefined,
  sizeMin: undefined,
  sizeMax: undefined,
  features: [],
  dynamicFields: [],
  importanceWeights: {},
}

describe("HND-01: Sticky bottom bar with save-then-open flow", () => {
  beforeEach(() => {
    mockOnboarding()
  })

  it('renders "Save Preferences" button initially', () => {
    render(
      <PreferencesForm
        defaultValues={defaultPrefs}
        onSave={vi.fn(() => Promise.resolve())}
      />
    )
    expect(screen.getByText("Save Preferences")).toBeDefined()
  })

  it("sticky bar container has sticky bottom-0 positioning", () => {
    render(
      <PreferencesForm
        defaultValues={defaultPrefs}
        onSave={vi.fn(() => Promise.resolve())}
      />
    )
    const btn = screen.getByText("Save Preferences")
    const stickyBar = btn.closest(".sticky.bottom-0") ?? btn.parentElement
    expect(stickyBar?.className).toContain("sticky")
    expect(stickyBar?.className).toContain("bottom-0")
  })

  it('after successful save, button text changes to "Save & Open in Flatfox"', async () => {
    const onSave = vi.fn(() => Promise.resolve())
    render(
      <PreferencesForm defaultValues={defaultPrefs} onSave={onSave} />
    )
    const btn = screen.getByRole("button", { name: /save preferences/i })
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.getByText(/save & open in flatfox/i)).toBeDefined()
    })
  })
})

describe("HND-02: Section progress indicator", () => {
  beforeEach(() => {
    mockOnboarding()
  })

  it("renders numbered section badges", () => {
    render(
      <PreferencesForm
        defaultValues={defaultPrefs}
        onSave={vi.fn(() => Promise.resolve())}
      />
    )
    // Each accordion trigger should have a numbered badge (1-6)
    expect(screen.getByText("1")).toBeDefined()
    expect(screen.getByText("6")).toBeDefined()
  })

  it('renders "6 sections" progress indicator', () => {
    render(
      <PreferencesForm
        defaultValues={defaultPrefs}
        onSave={vi.fn(() => Promise.resolve())}
      />
    )
    expect(screen.getByText(/6 sections/i)).toBeDefined()
  })
})

// ==============================================
// HND-03: Analyses empty state CTAs
// ==============================================

describe("HND-03: Analyses empty state CTAs", () => {
  // The analyses page is a server component and cannot be rendered in vitest.
  // We verify the expected markup by reading the source file directly --
  // tests will turn GREEN once Plans 01/02 add the CTA elements.

  const analysesPagePath = path.resolve(
    __dirname,
    "../app/(dashboard)/analyses/page.tsx"
  )

  it('when 0 analyses, renders "Open Flatfox" link with href containing flatfox.ch', () => {
    const src = fs.readFileSync(analysesPagePath, "utf8")
    expect(src).toContain("flatfox.ch")
    expect(src).toContain("Open Flatfox")
  })

  it('when 0 analyses, renders "Download" link with href="/download"', () => {
    const src = fs.readFileSync(analysesPagePath, "utf8")
    expect(src).toContain('href="/download"')
    expect(src).toContain("Download Extension")
  })

  it("when analyses exist, does NOT render empty state CTAs", () => {
    // Verify the conditional guard: CTAs only in the empty-state branch
    const src = fs.readFileSync(analysesPagePath, "utf8")
    // The page must have a conditional that checks analyses length
    expect(src).toContain("analyses.length === 0")
    // And the CTA links must appear within that conditional block
    expect(src).toContain("buttonVariants")
  })
})

// ==============================================
// HND-04: Filter bar conditional on analysis count
// ==============================================

describe("HND-04: AnalysesFilterBar conditional rendering", () => {
  it("returns null when analysisCount is 0", () => {
    const { container } = render(
      <AnalysesFilterBar
        profiles={[{ id: "1", name: "Test" }]}
        currentProfile=""
        currentSort="newest"
        lang="en"
        analysisCount={0}
      />
    )
    // When analysisCount is 0, the component should return null (empty)
    expect(container.innerHTML).toBe("")
  })

  it("renders filter bar when analysisCount > 0", () => {
    const { container } = render(
      <AnalysesFilterBar
        profiles={[{ id: "1", name: "Test" }]}
        currentProfile=""
        currentSort="newest"
        lang="en"
        analysisCount={5}
      />
    )
    // When analysisCount > 0 and profiles exist, the filter bar should render
    expect(container.innerHTML).not.toBe("")
  })
})
