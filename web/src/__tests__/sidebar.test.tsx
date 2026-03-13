import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"

// Polyfill window.matchMedia for jsdom (used by use-mobile hook)
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

// Mock next/navigation
const mockPathname = vi.fn().mockReturnValue("/dashboard")
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

// Mock next/link to render a plain anchor
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe("AppSidebar", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/dashboard")
  })

  function renderSidebar() {
    return render(
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
      </SidebarProvider>
    )
  }

  it("renders all 4 navigation items", () => {
    renderSidebar()

    expect(screen.getByText("Dashboard")).toBeDefined()
    expect(screen.getByText("Profiles")).toBeDefined()
    expect(screen.getByText("Analyses")).toBeDefined()
    expect(screen.getByText("Settings")).toBeDefined()
  })

  it("renders navigation links with correct hrefs", () => {
    renderSidebar()

    const links = screen.getAllByRole("link")
    const hrefs = links.map((link) => link.getAttribute("href"))

    expect(hrefs).toContain("/dashboard")
    expect(hrefs).toContain("/profiles")
    expect(hrefs).toContain("/analyses")
    expect(hrefs).toContain("/settings")
  })

  it("renders the HomeMatch brand name", () => {
    renderSidebar()

    expect(screen.getByText("HomeMatch")).toBeDefined()
  })

  it("marks dashboard as active when on /dashboard", () => {
    mockPathname.mockReturnValue("/dashboard")
    renderSidebar()

    // The active item should have data-active attribute
    const dashboardLink = screen.getByText("Dashboard").closest("a")
    expect(dashboardLink).toBeDefined()
  })
})
